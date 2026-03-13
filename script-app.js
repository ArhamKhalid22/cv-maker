import { GoogleGenerativeAI } from "@google/generative-ai";

// Global state
let analysisResults = null;
let skillCounter = 0;
let educationCounter = 0;
let experienceCounter = 0;
let achievementCounter = 0;
let languageCounter = 0;

function normalizeSkillName(name) {
    const raw = String(name || '').trim();
    if (!raw) return '';
    // If a combined string slipped in (e.g. "API - Proficient in..."), keep only the name
    const split = raw.split(' - ');
    return (split[0] || raw).trim();
}

function cleanSkillDescription(desc, skillName) {
    const name = normalizeSkillName(skillName);
    let d = String(desc || '').replace(/\s+/g, ' ').trim();
    if (!d) return '';

    // If description got polluted by a duplicated "Proficient in <name> ..." prefix, strip the prefix.
    if (name) {
        const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        d = d.replace(new RegExp(`^proficient\\s+in\\s+${n}\\s*(?:[-–—:]\\s*)?`, 'i'), '');
    }

    // Avoid repeating "with practical experience" endlessly
    d = d.replace(/(\bwith practical experience\b)(?:\s*\.\s*\1)+/gi, '$1');
    d = d.replace(/(\bwith practical experience\b)(?:\s+\1)+/gi, '$1');

    // Final tidy
    return d.replace(/\s+/g, ' ').trim();
}

function splitSkillNameAndDescription(name, description) {
    const rawName = String(name || '').trim();
    const rawDesc = String(description || '').trim();

    // If the name contains a description after " - " and desc is empty, split it.
    if (rawName.includes(' - ') && !rawDesc) {
        const parts = rawName.split(' - ');
        const n = (parts.shift() || '').trim();
        const d = parts.join(' - ').trim();
        return { name: normalizeSkillName(n), description: cleanSkillDescription(d, n) };
    }

    return { name: normalizeSkillName(rawName), description: cleanSkillDescription(rawDesc, rawName) };
}

// Storage keys
const STORAGE_KEYS = {
    CONTACT: 'resume_contact',
    EDUCATION: 'resume_education',
    EXPERIENCE: 'resume_experience',
    ACHIEVEMENTS: 'resume_achievements',
    LANGUAGES: 'resume_languages',
    REFERENCE: 'resume_reference',
    SKILLS: 'resume_skills',
    NAME: 'resume_name',
    TITLE: 'resume_title',
    OPENAI_API_KEY: 'openai_api_key',
    GEMINI_API_KEY: 'gemini_api_key',
    OPENROUTER_API_KEY: 'openrouter_api_key',
    UNDETECTABLE_API_KEY: 'undetectable_api_key'
};

// Prevent the app from using the revoked OpenRouter key that might be stuck in the user's browser localStorage
const revokedOpenRouterKey = "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";
if (localStorage.getItem(STORAGE_KEYS.OPENROUTER_API_KEY) === revokedOpenRouterKey) {
    localStorage.removeItem(STORAGE_KEYS.OPENROUTER_API_KEY);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first (disabled for now)
    // checkAuthentication();

    loadSavedData();
    initializeEventListeners();
    setupAutoSave();
    checkPendingJobDescription();
});

function checkPendingJobDescription() {
    const pendingDesc = localStorage.getItem('pending_job_description');
    if (pendingDesc) {
        const descTextarea = document.getElementById('job-description');
        if (descTextarea) {
            descTextarea.value = pendingDesc;
            localStorage.removeItem('pending_job_description');
            // Automatically trigger analysis if description is present
            analyzeJobDescription();
        }
    }
}

function checkAuthentication() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

    if (!currentUser) {
        // No user logged in, redirect to login page
        window.location.href = 'login.html';
        return;
    }

    // User is logged in, show user info
    displayUserInfo(currentUser);
}

function displayUserInfo(user) {
    const userInfoDiv = document.getElementById('user-info');
    const userNameSpan = document.getElementById('user-name');

    if (userInfoDiv && userNameSpan) {
        userNameSpan.textContent = `Welcome, ${user.name || user.email}`;
        userInfoDiv.style.display = 'block';
    }
}

function handleSignOut() {
    if (confirm('Are you sure you want to sign out?')) {
        // Clear current user session
        localStorage.removeItem('currentUser');

        // Redirect to login page
        window.location.href = 'login.html';
    }
}

function initializeEventListeners() {
    // Job analysis
    document.getElementById('analyze-btn').addEventListener('click', analyzeJobDescription);

    // Regenerate buttons
    const regenerateSummaryBtn = document.getElementById('regenerate-summary-btn');
    if (regenerateSummaryBtn) regenerateSummaryBtn.addEventListener('click', () => regenerateSection('summary'));

    const regenerateSkillsBtn = document.getElementById('regenerate-skills-btn');
    if (regenerateSkillsBtn) regenerateSkillsBtn.addEventListener('click', () => regenerateSection('skills'));

    const regenerateExperienceBtn = document.getElementById('regenerate-experience-btn');
    if (regenerateExperienceBtn) regenerateExperienceBtn.addEventListener('click', () => regenerateSection('experience'));

    const regenerateAchievementsBtn = document.getElementById('regenerate-achievements-btn');
    if (regenerateAchievementsBtn) regenerateAchievementsBtn.addEventListener('click', () => regenerateSection('achievements'));

    const regenerateCoverLetterBtn = document.getElementById('regenerate-cover-letter-btn');
    if (regenerateCoverLetterBtn) regenerateCoverLetterBtn.addEventListener('click', () => regenerateSection('cover-letter'));

    // Section toggles
    document.getElementById('profile-enabled').addEventListener('change', toggleSection);
    document.getElementById('skills-enabled').addEventListener('change', toggleSection);
    document.getElementById('education-enabled').addEventListener('change', toggleSection);
    document.getElementById('experience-enabled').addEventListener('change', toggleSection);
    document.getElementById('achievements-enabled').addEventListener('change', toggleSection);
    document.getElementById('languages-enabled').addEventListener('change', toggleSection);
    document.getElementById('reference-enabled').addEventListener('change', toggleSection);
    document.getElementById('cover-letter-enabled').addEventListener('change', toggleSection);

    // Add items
    document.getElementById('add-skill-btn').addEventListener('click', () => addSkillItem());
    document.getElementById('add-language-btn').addEventListener('click', () => addLanguageItem());
    document.getElementById('add-education-btn').addEventListener('click', () => addEducationItem());
    document.getElementById('add-experience-btn').addEventListener('click', () => addExperienceItem());
    document.getElementById('add-achievement-btn').addEventListener('click', () => addAchievementItem());

    // Auto-save indicators
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('input', () => showSaveIndicator());
    });

    // Generate PDF
    // IMPORTANT: don't pass the click event object into generatePDF()
    document.getElementById('generate-pdf-btn').addEventListener('click', () => generateResumePDF());
    document.getElementById('generate-cover-letter-btn').addEventListener('click', () => generateCoverLetterPDF());
}

let saveTimeout;
function showSaveIndicator() {
    let indicator = document.getElementById('save-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'save-indicator';
        indicator.className = 'save-indicator';
        indicator.innerHTML = '<div class="loading-spinner"></div> Saving...';
        document.body.appendChild(indicator);
    }

    indicator.classList.add('show');

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        indicator.innerHTML = '✅ Saved';
        setTimeout(() => {
            indicator.classList.remove('show');
            setTimeout(() => {
                indicator.innerHTML = '<div class="loading-spinner"></div> Saving...';
            }, 300);
        }, 1000);
    }, 800);
}

function setupAutoSave() {
    // Auto-save contact info
    ['contact-email', 'contact-phone', 'contact-location', 'contact-linkedin', 'resume-name', 'resume-title'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('blur', saveContactInfo);
            element.addEventListener('change', saveContactInfo);
        }
    });

    const referenceText = document.getElementById('reference-text');
    if (referenceText) {
        referenceText.addEventListener('blur', saveReference);
    }
}

function loadSavedData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    // if (!currentUser) return; // Allow loading even if no user exists

    // Load contact info
    const savedContact = localStorage.getItem(STORAGE_KEYS.CONTACT);
    if (savedContact) {
        try {
            const contact = JSON.parse(savedContact);
            if (contact.email) document.getElementById('contact-email').value = contact.email;
            if (contact.phone) document.getElementById('contact-phone').value = contact.phone;
            if (contact.location) document.getElementById('contact-location').value = contact.location;
            if (contact.linkedin) document.getElementById('contact-linkedin').value = contact.linkedin;
        } catch (e) {
            console.error('Error loading contact info:', e);
        }
    } else {
        // Use email from user account
        if (currentUser.email) {
            document.getElementById('contact-email').value = currentUser.email;
        }
    }

    // Load name and title
    const savedName = localStorage.getItem(STORAGE_KEYS.NAME);
    if (savedName) {
        document.getElementById('resume-name').value = savedName;
    } else if (currentUser.name) {
        document.getElementById('resume-name').value = currentUser.name;
    }

    const savedTitle = localStorage.getItem(STORAGE_KEYS.TITLE);
    if (savedTitle) {
        const isPlaceholderTitle = /^(relevant role|target role|the advertised position)$/i.test(savedTitle.trim()) || /professional candidate/i.test(savedTitle);
        if (isPlaceholderTitle) {
            // Clear bad placeholder so it doesn't keep auto-filling forever
            localStorage.removeItem(STORAGE_KEYS.TITLE);
        } else {
            document.getElementById('resume-title').value = savedTitle;
        }
    }

    // Load education
    const savedEducation = localStorage.getItem(STORAGE_KEYS.EDUCATION);
    if (savedEducation) {
        try {
            const education = JSON.parse(savedEducation);
            if (education.length > 0) {
                document.getElementById('education-list').innerHTML = '';
                education.forEach(edu => {
                    addEducationItem(edu);
                });
            } else {
                addEducationItem();
            }
        } catch (e) {
            console.error('Error loading education:', e);
            addEducationItem();
        }
    } else {
        addEducationItem();
    }

    // Load experience
    const savedExperience = localStorage.getItem(STORAGE_KEYS.EXPERIENCE);
    if (savedExperience) {
        try {
            const experience = JSON.parse(savedExperience);
            if (experience.length > 0) {
                document.getElementById('experience-list').innerHTML = '';
                experience.forEach(exp => {
                    addExperienceItem(exp);
                });
            } else {
                addExperienceItem();
            }
        } catch (e) {
            console.error('Error loading experience:', e);
            addExperienceItem();
        }
    } else {
        addExperienceItem();
    }

    // Load achievements
    const savedAchievements = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (savedAchievements) {
        try {
            const achievements = JSON.parse(savedAchievements);
            if (achievements.length > 0) {
                document.getElementById('achievements-list').innerHTML = '';
                achievements.forEach(ach => {
                    addAchievementItem(ach);
                });
            } else {
                addAchievementItem();
            }
        } catch (e) {
            console.error('Error loading achievements:', e);
            addAchievementItem();
        }
    } else {
        addAchievementItem();
    }

    // Load languages
    const savedLanguages = localStorage.getItem(STORAGE_KEYS.LANGUAGES);
    if (savedLanguages) {
        try {
            const languages = JSON.parse(savedLanguages);
            if (languages.length > 0) {
                document.getElementById('languages-list').innerHTML = '';
                languages.forEach(lang => {
                    addLanguageItem(lang);
                });
            } else {
                addLanguageItem();
            }
        } catch (e) {
            console.error('Error loading languages:', e);
            addLanguageItem();
        }
    } else {
        addLanguageItem();
    }

    // Load reference
    const savedReference = localStorage.getItem(STORAGE_KEYS.REFERENCE);
    if (savedReference) {
        document.getElementById('reference-text').value = savedReference;
    }

    // Load skills
    const savedSkills = localStorage.getItem(STORAGE_KEYS.SKILLS);
    if (savedSkills) {
        try {
            const skills = JSON.parse(savedSkills);
            if (skills.length > 0) {
                // Sanitize + dedupe stored skills (prevents repetition compounding)
                const seen = new Set();
                const cleanedSkills = [];
                skills.forEach(skill => {
                    const parsed = splitSkillNameAndDescription(skill?.name, skill?.description);
                    if (!parsed.name) return;
                    const key = parsed.name.toLowerCase();
                    if (seen.has(key)) return;
                    seen.add(key);
                    cleanedSkills.push(parsed);
                });

                // Write back cleaned version so it stays fixed after refresh
                localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(cleanedSkills));

                document.getElementById('skills-list').innerHTML = '';
                cleanedSkills.forEach(skill => addSkillItem(skill.name, skill.description));
            } else {
                addSkillItem();
            }
        } catch (e) {
            console.error('Error loading skills:', e);
            addSkillItem();
        }
    } else {
        addSkillItem();
    }
}

function saveContactInfo() {
    const contact = {
        email: document.getElementById('contact-email').value.trim(),
        phone: document.getElementById('contact-phone').value.trim(),
        location: document.getElementById('contact-location').value.trim(),
        linkedin: document.getElementById('contact-linkedin').value.trim()
    };
    localStorage.setItem(STORAGE_KEYS.CONTACT, JSON.stringify(contact));

    const name = document.getElementById('resume-name').value.trim();
    if (name) localStorage.setItem(STORAGE_KEYS.NAME, name);

    const title = document.getElementById('resume-title').value.trim();
    if (title) localStorage.setItem(STORAGE_KEYS.TITLE, title);
}

function saveEducation() {
    const educationCards = document.querySelectorAll('#education-list .item-card');
    const education = [];
    educationCards.forEach(card => {
        const inputs = card.querySelectorAll('input[name]');
        const edu = {};
        inputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                edu[input.name] = value;
            }
        });
        if (Object.keys(edu).length > 0) {
            education.push(edu);
        }
    });
    localStorage.setItem(STORAGE_KEYS.EDUCATION, JSON.stringify(education));
}

function saveExperience() {
    const experienceCards = document.querySelectorAll('#experience-list .item-card');
    const experience = [];
    experienceCards.forEach(card => {
        const inputs = card.querySelectorAll('input[name]');
        const exp = {
            responsibilities: []
        };
        inputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                exp[input.name] = value;
            }
        });

        const respInputs = card.querySelectorAll('.responsibility-item input');
        respInputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                exp.responsibilities.push(value);
            }
        });

        if (Object.keys(exp).length > 1 || exp.responsibilities.length > 0) {
            experience.push(exp);
        }
    });
    localStorage.setItem(STORAGE_KEYS.EXPERIENCE, JSON.stringify(experience));
}

function saveSkills() {
    const skillCards = document.querySelectorAll('#skills-list .item-card');
    const skills = [];
    skillCards.forEach(card => {
        const nameInput = card.querySelector('input[name="skill-name"]');
        const descInput = card.querySelector('input[name="skill-desc"]');
        const parsed = splitSkillNameAndDescription(nameInput ? nameInput.value : '', descInput ? descInput.value : '');
        if (parsed.name) {
            skills.push({ name: parsed.name, description: parsed.description });
        }
    });
    localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(skills));
}

function saveAchievements() {
    const achievementCards = document.querySelectorAll('#achievements-list .item-card');
    const achievements = [];
    achievementCards.forEach(card => {
        const input = card.querySelector('input[name="achievement"]');
        const value = input ? input.value.trim() : '';
        if (value) {
            achievements.push(value);
        }
    });
    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
}

function saveLanguages() {
    const languageCards = document.querySelectorAll('#languages-list .item-card');
    const languages = [];
    languageCards.forEach(card => {
        const input = card.querySelector('input[name="language"]');
        const value = input ? input.value.trim() : '';
        if (value) {
            languages.push(value);
        }
    });
    localStorage.setItem(STORAGE_KEYS.LANGUAGES, JSON.stringify(languages));
}

function saveReference() {
    const text = document.getElementById('reference-text').value.trim();
    localStorage.setItem(STORAGE_KEYS.REFERENCE, text);
}

function toggleSection(e) {
    const checkbox = e.target;
    const sectionId = checkbox.id.replace('-enabled', '');
    const contentDiv = document.getElementById(`${sectionId}-content`);

    if (checkbox.checked) {
        contentDiv.classList.remove('hidden');
    } else {
        contentDiv.classList.add('hidden');
    }
}

async function regenerateSection(sectionType) {
    const jobDescription = document.getElementById('job-description').value.trim();
    const userName = document.getElementById('resume-name').value.trim();
    const btn = document.getElementById(`regenerate-${sectionType}-btn`);

    if (!jobDescription) {
        alert('Please enter a job description first.');
        return;
    }

    const openRouterKey = localStorage.getItem(STORAGE_KEYS.OPENROUTER_API_KEY);
    const geminiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY);

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '🔄 Regenerating...';

    try {
        const resumeData = collectResumeData();
        const skillNames = Array.from(document.querySelectorAll('#skills-list input[name="skill-name"]'))
            .map(input => input.value.trim())
            .filter(Boolean);

        const prompt = `
          Regenerate the "${sectionType}" section for an ATS-optimized resume based on the Job Description provided.
          CRITICAL INSTRUCTION: You MUST generate a COMPLETELY NEW, UNIQUELY PARAPHRASED response. Do NOT simply repeat the 'Current Section Data'. Rewrite it from scratch to be highly tailored and relevant specifically to the Job Description requirements.

          User Info - Title: ${resumeData.title}, Name: ${userName}
          Job Description: ${jobDescription}
          Current Section Data (DO NOT COPY THIS! Write a better, paraphrased version): 
          ${JSON.stringify(resumeData[sectionType] || {})}
          Other Context - Skills: ${skillNames.join(', ')}
          
          Return ONLY the new paraphrased content for this section as valid JSON.
          - For "skills": return a JSON array of objects like [{"name": "Skill Name", "description": "Brief description"}]
          - For "experience": return a JSON array of objects like [{"position": "Title", "company": "Co", "location": "Loc", "period": "Dates", "responsibilities": ["Bullet 1", "Bullet 2"]}]
          - For "achievements": return a JSON array of achievement strings
          - For "summary" or "cover-letter": return plain text
        `;

        let text;
        if (openRouterKey) {
            // Try OpenRouter first (Llama 3 or DeepSeek)
            text = await callOpenRouter(openRouterKey, prompt);
        } else if (geminiKey) {
            // Fallback to Gemini
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            text = response.text();
        } else {
            throw new Error("No API key found. Please configure OpenRouter or Gemini on the landing page.");
        }

        let content;
        try {
            // Check if the AI wrapped the response in markdown code blocks
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            const jsonString = jsonMatch ? jsonMatch[1].trim() : text.trim();
            
            // Try matching bracket structures if it's not explicitly in a block
            const bracketMatch = jsonString.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
            const finalStringToParse = bracketMatch ? bracketMatch[0] : jsonString;
            
            content = JSON.parse(finalStringToParse);
        } catch (e) {
            console.warn("Could not parse as JSON. Using raw text.", e);
            content = text.trim();
        }

        applyRegeneratedData(sectionType, content);
        showMessage(`${sectionType.charAt(0).toUpperCase() + sectionType.slice(1).replace('-', ' ')} regenerated!`, 'success');
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to regenerate: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function applyRegeneratedData(sectionType, content) {
    switch (sectionType) {
        case 'summary':
            document.getElementById('profile-text').value = content;
            break;
        case 'skills':
            document.getElementById('skills-list').innerHTML = '';
            
            // If AI returned a string instead of JSON array, try to split it into a list
            if (typeof content === 'string') {
                content = content.split('\n').map(s => s.trim().replace(/^[-*•\d.]+\s*/, '')).filter(Boolean);
            }

            if (Array.isArray(content)) {
                const seen = new Set();
                content.forEach(skill => {
                    // Handle both plain strings and objects
                    let skillName = '';
                    let skillDesc = '';
                    if (typeof skill === 'string') {
                        skillName = skill.trim();
                    } else if (skill && typeof skill === 'object') {
                        skillName = (skill.name || skill.skill || '').trim();
                        skillDesc = (skill.description || skill.desc || '').trim();
                    }
                    if (!skillName) return;
                    const parsed = splitSkillNameAndDescription(skillName, skillDesc);
                    if (!parsed.name) return;
                    const key = parsed.name.toLowerCase();
                    if (seen.has(key)) return;
                    seen.add(key);
                    addSkillItem(parsed.name, parsed.description);
                });
            }
            saveSkills();
            break;
        case 'experience':
            document.getElementById('experience-list').innerHTML = '';
            
            if (typeof content === 'string') {
                 // Try parsing a generic text block into a single experience object
                 content = [{
                     position: "Regenerated Role",
                     company: "Regenerated Company",
                     location: "",
                     period: "",
                     responsibilities: content.split('\n').map(l => l.trim().replace(/^[-*•\d.]+\s*/, '')).filter(Boolean)
                 }];
            }

            if (Array.isArray(content)) {
                content.forEach(exp => {
                    // Normalize keys just in case AI uses slightly different names
                    const normalizedExp = {
                        position: exp.position || exp.title || exp.role || '',
                        company: exp.company || exp.employer || exp.org || '',
                        location: exp.location || '',
                        period: exp.period || exp.dates || exp.duration || '',
                        responsibilities: Array.isArray(exp.responsibilities) ? exp.responsibilities : 
                                         (Array.isArray(exp.bullets) ? exp.bullets : 
                                         (Array.isArray(exp.highlights) ? exp.highlights : []))
                    };
                    addExperienceItem(normalizedExp);
                });
            }
            saveExperience();
            break;
        case 'achievements':
            document.getElementById('achievements-list').innerHTML = '';
            
            if (typeof content === 'string') {
                content = content.split('\n').map(s => s.trim().replace(/^[-*•\d.]+\s*/, '')).filter(Boolean);
            }

            if (Array.isArray(content)) {
                content.forEach(ach => addAchievementItem(ach));
            }
            saveAchievements();
            break;
        case 'cover-letter':
            document.getElementById('cover-letter-text').value = content;
            break;
    }
}

async function humanizeCoverLetter() {
    const coverLetterTextarea = document.getElementById('cover-letter-text');
    const humanizeBtn = document.getElementById('humanize-btn');
    const content = coverLetterTextarea.value.trim();

    if (!content) {
        alert('Please generate or write a cover letter first.');
        return;
    }

    const openRouterKey = localStorage.getItem(STORAGE_KEYS.OPENROUTER_API_KEY);
    const geminiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY);

    humanizeBtn.disabled = true;
    humanizeBtn.innerHTML = 'Humanizing... <span class="loading"></span>';

    try {
        const prompt = `
          Humanize the following cover letter to make it sound more natural and less like it was generated by AI.
          Keep the professional tone and key information intact.
          Cover Letter: ${content}
        `;

        let text;
        if (openRouterKey) {
            text = await callOpenRouter(openRouterKey, prompt);
        } else if (geminiKey) {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            text = response.text();
        } else {
            throw new Error("No API key found. Please configure OpenRouter or Gemini on the landing page.");
        }

        coverLetterTextarea.value = text.trim();
        showMessage('Cover letter humanized successfully!', 'success');
    } catch (error) {
        console.error('Error:', error);
        alert('Humanization failed: ' + error.message);
    } finally {
        humanizeBtn.disabled = false;
        humanizeBtn.innerHTML = '✨ Humanize Writing (Reduce AI Detection)';
    }
}

async function analyzeJobDescription() {
    const jobDescription = document.getElementById('job-description').value.trim();
    const userName = document.getElementById('resume-name').value.trim();
    const analyzeBtn = document.getElementById('analyze-btn');

    if (!jobDescription) {
        alert('Please enter a job description');
        return;
    }

    const openRouterKey = localStorage.getItem(STORAGE_KEYS.OPENROUTER_API_KEY);
    const geminiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY);

    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = 'Analyzing... <span class="loading"></span>';

    try {
        const resumeData = collectResumeData();
        const userExperience = JSON.stringify(resumeData.experience || {});
        const userEducation = JSON.stringify(resumeData.education || {});

        const prompt = `
          Analyze the following job description and extract key information for an ATS-optimized resume.
          Return ONLY a valid JSON object with the following structure:
          {
            "companyName": "The name of the company hiring, if mentioned (otherwise an empty string)",
            "extractedSkills": ["skill1", "skill2", ...],
            "extractedKeywords": [{"skill": "skill1", "category": "technical/soft/management/etc"}],
            "educationRequirements": ["degree1", ...],
            "experienceRequirement": "e.g. 5+ years",
            "suggestedTitle": "Professional Job Title",
            "professionalSummary": "A concise, 3-4 sentence ATS-optimized professional summary tailored to this role.",
            "recommendations": [{"type": "skills/technical/leadership", "message": "specific advice to pass ATS filters"}],
            "suggestedCoverLetter": "A full, professional, ready-to-use cover letter tailored to this role. IMPORTANT RULES: 1. Generate EXACTLY ONE cover letter. 2. Do NOT mention 'Template' or include any notes/metadata. 3. Use the candidate's actual name '${userName || 'the candidate'}' instead of placeholders like [Your Name]. 4. Incorporate relevant details from experience (${userExperience}) and education (${userEducation}). 5. Avoid making up work history. 6. End with Sincerely, followed by the candidate's real name."
          }
          Job Description: ${jobDescription}
        `;

        let text;
        if (openRouterKey) {
            text = await callOpenRouter(openRouterKey, prompt);
        } else if (geminiKey) {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            text = response.text();
        } else {
            throw new Error("No API key found. Please configure OpenRouter or Gemini on the landing page.");
        }
        // Check if the AI wrapped the response in markdown code blocks
        const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonString = mdMatch ? mdMatch[1].trim() : text.trim();
        
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Could not parse AI response");
        const data = JSON.parse(jsonMatch[0]);

        if (data.companyName) {
            const companyInput = document.getElementById('target-company');
            if (companyInput && !companyInput.value) {
                companyInput.value = data.companyName;
            }
        }
        if (data.suggestedTitle) {
            const roleInput = document.getElementById('target-role');
            if (roleInput && !roleInput.value) {
                roleInput.value = data.suggestedTitle;
            }
        }

        analysisResults = data;
        displayAnalysisResults(data);
        applyRecommendations(data);
        showMessage('Analysis complete!', 'success');
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to analyze job description: ' + error.message);
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = 'Analyze Job Description';
    }
}

function displayAnalysisResults(data) {
    const resultsDiv = document.getElementById('analysis-results');

    let html = `
        <h3>📊 Analysis Results</h3>
        <div style="margin-top: 15px;">
            <h4>Extracted Skills:</h4>
            <div class="skills-tags">
    `;

    if (data.extractedSkills && data.extractedSkills.length > 0) {
        data.extractedSkills.forEach(skill => {
            html += `<span class="skill-tag">${skill}</span>`;
        });
    } else {
        html += '<span style="color: #666;">No specific skills detected</span>';
    }

    html += `
            </div>
        </div>
    `;

    if (data.professionalSummary) {
        const profileTextarea = document.getElementById('profile-text');
        if (profileTextarea) {
            profileTextarea.value = data.professionalSummary;
        }
        html += `
            <div style="margin-top: 20px;">
                <h4>🤖 AI-Generated Summary Available!</h4>
                <p style="color: #666; font-size: 14px;">A professional summary has been generated based on the job description.</p>
            </div>
        `;
    }

    if (data.recommendations && data.recommendations.length > 0) {
        html += '<div style="margin-top: 20px;"><h4>Recommendations:</h4>';
        data.recommendations.forEach(rec => {
            html += `<div class="recommendation">${rec.message}</div>`;
        });
        html += '</div>';
    }

    if (data.suggestedTitle) {
        document.getElementById('resume-title').value = data.suggestedTitle;
        saveContactInfo();
    }

    if (data.suggestedCoverLetter) {
        const coverLetterTextarea = document.getElementById('cover-letter-text');
        if (coverLetterTextarea) {
            const actualName = document.getElementById('resume-name').value.trim() || 'Candidate';
            
            // Clean up any remaining placeholders that the AI might have accidentally generated
            let coverText = data.suggestedCoverLetter
                .replace(/\[Your Name\]/gi, actualName)
                .replace(/\[Your Full Name\]/gi, actualName)
                .replace(/\[Full Name\]/gi, actualName)
                .replace(/\[Name\]/gi, actualName)
                .replace(/\[Candidate Name\]/gi, actualName);
                
            coverLetterTextarea.value = coverText.trim();
            document.getElementById('cover-letter-enabled').checked = true;
            document.getElementById('cover-letter-content').classList.remove('hidden');
        }
    }

    if (data.note) {
        html += `<div style="margin-top: 10px; color: #856404; background-color: #fff3cd; padding: 10px; border-radius: 4px; font-size: 13px;">
            ⚠️ ${data.note}. Please check your OpenAI billing or plan.
        </div>`;
    }

    resultsDiv.innerHTML = html;
    resultsDiv.classList.remove('hidden');

    // Calculate ATS Score
    calculateATSCompatibility(data);
}

function calculateATSCompatibility(data) {
    const atsDiv = document.getElementById('ats-analysis');
    const scoreBar = document.getElementById('ats-score-bar');
    const scoreText = document.getElementById('ats-score-text');
    const missingKeywordsList = document.getElementById('missing-keywords-list');

    // Get user's current skills
    const userSkills = Array.from(document.querySelectorAll('#skills-list input[name="skill-name"]'))
        .map(input => input.value.trim().toLowerCase())
        .filter(s => s !== '');

    const targetSkills = data.extractedSkills || [];
    if (targetSkills.length === 0) {
        atsDiv.classList.add('hidden');
        return;
    }

    const matchedSkills = targetSkills.filter(skill =>
        userSkills.some(userSkill => userSkill.includes(skill.toLowerCase()) || skill.toLowerCase().includes(userSkill))
    );

    const missingSkills = targetSkills.filter(skill =>
        !userSkills.some(userSkill => userSkill.includes(skill.toLowerCase()) || skill.toLowerCase().includes(userSkill))
    );

    const score = Math.round((matchedSkills.length / targetSkills.length) * 100);

    // Update UI
    scoreBar.style.setProperty('--score-width', `${score}%`);
    scoreText.textContent = `${score}%`;

    missingKeywordsList.innerHTML = '';
    missingSkills.forEach(skill => {
        const pill = document.createElement('span');
        pill.className = 'keyword-pill';
        pill.textContent = skill;
        pill.onclick = () => {
            addSkillItem(skill, `Proficient in ${skill} as required for the role`);
            pill.classList.add('added');
            calculateATSCompatibility(data); // Recalculate
        };
        missingKeywordsList.appendChild(pill);
    });

    atsDiv.classList.remove('hidden');
}

function applyRecommendations(data) {
    // Auto-populate skills if detected (merge with existing)
    if (data.extractedSkills && data.extractedSkills.length > 0) {
        const existingSkillInputs = Array.from(document.querySelectorAll('#skills-list input[name="skill-name"]'));
        const existingSkills = existingSkillInputs
            .map(input => input.value.trim())
            .filter(Boolean);

        // Only show 5 skills by default (user can add more manually)
        const MAX_DEFAULT_SKILLS = 5;

        // If user hasn't entered any skills yet, replace with the top 5 extracted skills
        if (existingSkills.length === 0) {
            document.getElementById('skills-list').innerHTML = '';
            data.extractedSkills.slice(0, MAX_DEFAULT_SKILLS).forEach(skill => {
                addSkillItem(skill, generateSkillDescription(skill, data));
            });
        } else {
            // Otherwise, only add up to 5 total (don't spam the list)
            const normalizedExisting = new Set(existingSkills.map(s => s.toLowerCase()));
            let currentCount = existingSkills.length;

            data.extractedSkills.forEach(skill => {
                if (currentCount >= MAX_DEFAULT_SKILLS) return;
                if (!normalizedExisting.has(String(skill).toLowerCase())) {
                    addSkillItem(skill, generateSkillDescription(skill, data));
                    normalizedExisting.add(String(skill).toLowerCase());
                    currentCount += 1;
                }
            });
        }

        saveSkills();
    }
}

function generateSkillDescription(skill, analysisData) {
    // Generate a one-line description based on skill and job context
    const skillLower = skill.toLowerCase();
    const descriptions = {
        'javascript': 'Proficient in modern JavaScript frameworks and ES6+ features',
        'python': 'Experienced in Python development and data manipulation',
        'react': 'Skilled in building responsive React applications',
        'project management': 'Expert in leading cross-functional teams and delivering projects on time',
        'data analysis': 'Strong analytical skills with experience in data-driven decision making',
        'communication': 'Excellent written and verbal communication skills',
        'leadership': 'Proven ability to lead and motivate teams to achieve goals',
        'financial analysis': 'Expert in financial modeling and strategic analysis'
    };

    // Check if we have a predefined description
    for (const [key, desc] of Object.entries(descriptions)) {
        if (skillLower.includes(key)) {
            return desc;
        }
    }

    // Generate based on category
    const category = analysisData.extractedKeywords.find(k => k.skill.toLowerCase() === skillLower)?.category;
    if (category === 'technical') {
        return `Proficient in ${skill} with hands-on experience in development`;
    } else if (category === 'management') {
        return `Experienced in ${skill} with a track record of successful implementations`;
    } else if (category === 'soft') {
        return `Strong ${skill} skills with demonstrated ability in professional settings`;
    }

    return `Experienced in ${skill} with proven results`;
}

function addSkillItem(name = '', description = '') {
    const skillsList = document.getElementById('skills-list');
    const id = `skill-${skillCounter++}`;

    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-card';
    itemDiv.id = id;
    itemDiv.innerHTML = `
        <div class="item-card-header">
            <h4>Skill</h4>
            <button type="button" class="btn btn-danger" onclick="removeItem('${id}'); saveSkills();">Remove</button>
        </div>
        <input type="text" name="skill-name" class="item-input" placeholder="Skill name (e.g., JavaScript, Project Management)" value="${name}" onblur="saveSkills();">
        <input type="text" name="skill-desc" class="item-input" placeholder="One-line description (optional)" value="${description}" style="margin-top: 8px;" onblur="saveSkills();">
    `;

    skillsList.appendChild(itemDiv);
}

function addEducationItem(eduData = null) {
    const educationList = document.getElementById('education-list');
    const id = `education-${educationCounter++}`;

    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-card';
    itemDiv.id = id;
    itemDiv.innerHTML = `
        <div class="item-card-header">
            <h4>Education Entry</h4>
            <button type="button" class="btn btn-danger" onclick="removeItem('${id}'); saveEducation();">Remove</button>
        </div>
        <input type="text" name="degree" class="item-input" placeholder="Degree (e.g., Bachelor of Science)" value="${eduData?.degree || ''}" onblur="saveEducation();">
        <input type="text" name="school" class="item-input" placeholder="School/University" value="${eduData?.school || ''}" onblur="saveEducation();">
        <input type="text" name="field" class="item-input" placeholder="Field of Study" value="${eduData?.field || ''}" onblur="saveEducation();">
        <input type="text" name="period" class="item-input" placeholder="Period (e.g., 2015-2019)" value="${eduData?.period || ''}" onblur="saveEducation();">
    `;

    educationList.appendChild(itemDiv);
}

function addExperienceItem(expData = null) {
    const experienceList = document.getElementById('experience-list');
    const id = `experience-${experienceCounter++}`;

    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-card';
    itemDiv.id = id;
    itemDiv.innerHTML = `
        <div class="item-card-header">
            <h4>Work Experience Entry</h4>
            <button type="button" class="btn btn-danger" onclick="removeItem('${id}'); saveExperience();">Remove</button>
        </div>
        <input type="text" name="position" class="item-input" placeholder="Position/Title" value="${expData?.position || ''}" onblur="saveExperience();">
        <input type="text" name="company" class="item-input" placeholder="Company Name" value="${expData?.company || ''}" onblur="saveExperience();">
        <input type="text" name="location" class="item-input" placeholder="Location" value="${expData?.location || ''}" onblur="saveExperience();">
        <input type="text" name="period" class="item-input" placeholder="Period (e.g., 2020-present)" value="${expData?.period || ''}" onblur="saveExperience();">
        <div id="responsibilities-${id}" style="margin-top: 10px;">
            <label style="font-weight: 600; display: block; margin-bottom: 5px;">Responsibilities:</label>
        </div>
        <button type="button" class="btn btn-secondary" onclick="addResponsibility('${id}')" style="margin-top: 5px;">+ Add Responsibility</button>
    `;

    experienceList.appendChild(itemDiv);

    // Add responsibilities if data exists
    if (expData && expData.responsibilities && expData.responsibilities.length > 0) {
        expData.responsibilities.forEach(resp => {
            addResponsibility(id, resp);
        });
    } else {
        addResponsibility(id); // Add one initial responsibility
    }
}

function addResponsibility(experienceId, value = '') {
    const responsibilitiesDiv = document.getElementById(`responsibilities-${experienceId}`);
    const respId = `resp-${Date.now()}-${Math.random()}`;

    const respDiv = document.createElement('div');
    respDiv.className = 'responsibility-item';
    respDiv.id = respId;
    respDiv.innerHTML = `
        <input type="text" class="item-input" placeholder="Responsibility or achievement" value="${value}" onblur="saveExperience();">
        <button type="button" class="btn btn-danger" onclick="removeItem('${respId}'); saveExperience();">×</button>
    `;

    responsibilitiesDiv.appendChild(respDiv);
}

function addLanguageItem(value = '') {
    const languagesList = document.getElementById('languages-list');
    const id = `language-${languageCounter++}`;

    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-card';
    itemDiv.id = id;
    itemDiv.innerHTML = `
        <div class="item-card-header">
            <h4>Language</h4>
            <button type="button" class="btn btn-danger" onclick="removeItem('${id}'); saveLanguages();">Remove</button>
        </div>
        <input type="text" name="language" class="item-input" placeholder="e.g. English (Fluent), Spanish (Basic)" value="${value}" onblur="saveLanguages();">
    `;

    languagesList.appendChild(itemDiv);
}

function addAchievementItem(value = '') {
    const achievementsList = document.getElementById('achievements-list');
    const id = `achievement-${achievementCounter++}`;

    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-card';
    itemDiv.id = id;
    itemDiv.innerHTML = `
        <div class="item-card-header">
            <h4>Achievement</h4>
            <button type="button" class="btn btn-danger" onclick="removeItem('${id}'); saveAchievements();">Remove</button>
        </div>
        <input type="text" name="achievement" class="item-input" placeholder="Award, certification, or key project..." value="${value}" onblur="saveAchievements();">
    `;

    achievementsList.appendChild(itemDiv);
}

function removeItem(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

// ===== PDF GENERATION (jsPDF direct text) =====

// Helper: wraps long text into lines that fit within maxWidth
function _wrapText(doc, text, maxWidth) {
    return doc.splitTextToSize(text, maxWidth);
}

// Helper: adds a new page if y position exceeds page height
function _checkPageBreak(doc, y, margin, pageHeight) {
    if (y > pageHeight - margin) {
        doc.addPage();
        return margin;
    }
    return y;
}

// Core PDF builder using jsPDF directly
function _buildPDFWithJsPDF(resumeData, sections, filename) {
    // Access jsPDF constructor safely
    let jsPDF;
    if (window.jspdf && window.jspdf.jsPDF) {
        jsPDF = window.jspdf.jsPDF;
    } else if (window.jspdf) {
        jsPDF = window.jspdf;
    } else if (window.html2pdf && window.html2pdf.Worker && window.html2pdf.Worker.prototype.pdf) {
        // Some versions of html2pdf bundle it differently
        jsPDF = window.jspdf.jsPDF;
    }

    if (!jsPDF) {
        alert('PDF library (jsPDF) not found. Please ensure the page is fully loaded and you have an internet connection.');
        console.error('jsPDF not found in window.jspdf or window');
        return;
    }

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });

    const pageWidth = doc.internal.pageSize.getWidth();   // ~612
    const pageHeight = doc.internal.pageSize.getHeight();  // ~792
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    // ---- HEADER (Times New Roman, black, left-aligned) ----
    doc.setTextColor(0, 0, 0);

    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.text(resumeData.name, margin, y);
    y += 25;

    doc.setFont('times', 'normal');
    doc.setFontSize(14);
    doc.text(resumeData.title, margin, y);
    y += 20;

    // Contact line
    const contactParts = [];
    if (resumeData.contact.email) contactParts.push(resumeData.contact.email);
    if (resumeData.contact.phone) contactParts.push(resumeData.contact.phone);
    if (resumeData.contact.location) contactParts.push(resumeData.contact.location);
    if (resumeData.contact.linkedin) contactParts.push(resumeData.contact.linkedin);

    if (contactParts.length > 0) {
        doc.setFontSize(9);
        doc.text(contactParts.join('  |  '), margin, y);
        y += 15;
    }

    // Divider line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 20;

    // ---- SECTIONS ----
    sections.forEach(section => {
        y = _checkPageBreak(doc, y, margin, pageHeight);

        // Section title
        doc.setFontSize(13);
        doc.setFont('times', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(section.title.toUpperCase(), margin, y);
        y += 3;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 12;

        // Section content
        doc.setFont('times', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);

        if (section.type === 'text') {
            const lines = _wrapText(doc, section.content, contentWidth);
            lines.forEach(line => {
                y = _checkPageBreak(doc, y, margin, pageHeight);
                doc.text(line, margin, y);
                y += 14;
            });
            y += 5;
        } else if (section.type === 'bullets') {
            section.items.forEach(item => {
                y = _checkPageBreak(doc, y, margin, pageHeight);
                const lines = _wrapText(doc, '•  ' + item, contentWidth);
                lines.forEach((line, i) => {
                    y = _checkPageBreak(doc, y, margin, pageHeight);
                    doc.text(line, margin + (i > 0 ? 15 : 0), y);
                    y += 14;
                });
            });
            y += 5;
        } else if (section.type === 'experience') {
            section.items.forEach(exp => {
                y = _checkPageBreak(doc, y, margin, pageHeight);
                // Job title + period
                doc.setFont('times', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(0, 0, 0);
                doc.text(exp.position || '', margin, y);
                doc.text(exp.period || '', pageWidth - margin, y, { align: 'right' });
                y += 14;
                // Company + location
                doc.setFont('times', 'italic');
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.text(`${exp.company || ''}${exp.location ? ', ' + exp.location : ''}`, margin, y);
                y += 14;
                // Responsibilities
                doc.setFont('times', 'normal');
                doc.setFontSize(11);
                doc.setTextColor(0, 0, 0);
                (exp.responsibilities || []).forEach(resp => {
                    y = _checkPageBreak(doc, y, margin, pageHeight);
                    const lines = _wrapText(doc, '•  ' + resp, contentWidth - 15);
                    lines.forEach((line, i) => {
                        y = _checkPageBreak(doc, y, margin, pageHeight);
                        doc.text(line, margin + 10 + (i > 0 ? 15 : 0), y);
                        y += 13;
                    });
                });
                y += 8;
            });
        } else if (section.type === 'education') {
            section.items.forEach(edu => {
                y = _checkPageBreak(doc, y, margin, pageHeight);
                doc.setFont('times', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(0, 0, 0);
                const degreeText = `${edu.degree || ''}${edu.field ? ' in ' + edu.field : ''}`;
                doc.text(degreeText, margin, y);
                doc.text(edu.period || '', pageWidth - margin, y, { align: 'right' });
                y += 14;
                doc.setFont('times', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.text(edu.school || '', margin, y);
                y += 16;
            });
            y += 5;
        } else if (section.type === 'inline') {
            const lines = _wrapText(doc, section.items.join('  •  '), contentWidth);
            lines.forEach(line => {
                y = _checkPageBreak(doc, y, margin, pageHeight);
                doc.text(line, margin, y);
                y += 14;
            });
            y += 5;
        }
    });

    doc.save(filename);
}

// ---- GENERATE RESUME PDF ----
async function generateResumePDF() {
    const generateBtn = document.getElementById('generate-pdf-btn');
    const originalText = generateBtn.innerHTML;

    const name = document.getElementById('resume-name').value.trim();
    const title = document.getElementById('resume-title').value.trim();

    if (!name || !title) {
        alert('Please fill in at least your name and professional title');
        return;
    }

    saveContactInfo();
    saveEducation();
    saveExperience();
    saveSkills();
    saveAchievements();
    saveLanguages();

    generateBtn.disabled = true;
    generateBtn.innerHTML = 'Generating Resume... <span class="loading"></span>';

    try {
        const resumeData = collectResumeData();
        const sections = [];

        console.log('[PDF Debug] resumeData:', JSON.stringify(resumeData, null, 2));

        // Include sections if they have content (ignore toggle – always include data that exists)
        if (resumeData.profile.content) {
            sections.push({ title: 'Professional Summary', type: 'text', content: resumeData.profile.content });
        }
        if (resumeData.experience.items.length > 0) {
            sections.push({ title: 'Work Experience', type: 'experience', items: resumeData.experience.items });
        }
        if (resumeData.skills.items.length > 0) {
            sections.push({ title: 'Skills', type: 'inline', items: resumeData.skills.items.slice(0, 5) });
        }
        if (resumeData.education.items.length > 0) {
            sections.push({ title: 'Education', type: 'education', items: resumeData.education.items });
        }
        if (resumeData.achievements.items.length > 0) {
            sections.push({ title: 'Achievements', type: 'bullets', items: resumeData.achievements.items });
        }
        if (resumeData.languages.items.length > 0) {
            sections.push({ title: 'Languages', type: 'inline', items: resumeData.languages.items });
        }
        if (resumeData.reference.content) {
            sections.push({ title: 'Reference', type: 'text', content: resumeData.reference.content });
        }

        console.log('[PDF Debug] sections to render:', sections.length, sections.map(s => s.title));

        if (sections.length === 0) {
            alert('No content to include in the PDF. Please fill in some sections or analyze a job description first.');
            return;
        }

        const targetCompany = document.getElementById('target-company')?.value.trim();
        
        let filename;
        if (targetCompany) {
            filename = `${targetCompany.replace(/\s+/g, '_')}_Resume.pdf`;
        } else {
            filename = `${name.replace(/\s+/g, '_')}_Resume.pdf`;
        }
        _buildPDFWithJsPDF(resumeData, sections, filename);
        showMessage('Resume PDF generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating Resume PDF:', error);
        alert('PDF Error: ' + error.message);
        showMessage('Failed to generate Resume PDF: ' + error.message, 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
    }
}

// ---- GENERATE COVER LETTER PDF ----
async function generateCoverLetterPDF() {
    const generateBtn = document.getElementById('generate-cover-letter-btn');
    const originalText = generateBtn.innerHTML;

    const name = document.getElementById('resume-name').value.trim();
    const title = document.getElementById('resume-title').value.trim();
    const coverLetterText = document.getElementById('cover-letter-text').value.trim();

    if (!name || !title) {
        alert('Please fill in at least your name and professional title');
        return;
    }

    if (!coverLetterText) {
        alert('Please write or generate a cover letter first. Enable the Cover Letter section and add content.');
        return;
    }

    saveContactInfo();

    generateBtn.disabled = true;
    generateBtn.innerHTML = 'Generating Cover Letter... <span class="loading"></span>';

    try {
        const resumeData = collectResumeData();
        
        let jsPDF;
        if (window.jspdf && window.jspdf.jsPDF) {
            jsPDF = window.jspdf.jsPDF;
        } else if (window.jspdf) {
            jsPDF = window.jspdf;
        }

        if (!jsPDF) {
            throw new Error("jsPDF library not found");
        }

        const doc = new jsPDF({ unit: 'pt', format: 'letter' });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 50;
        const contentWidth = pageWidth - (margin * 2);
        let y = margin;

        // All black, Times New Roman, left-aligned
        doc.setTextColor(0, 0, 0);

        // Name - left aligned
        doc.setFont('times', 'bold');
        doc.setFontSize(18);
        doc.text(resumeData.name, margin, y);
        y += 20;

        // Title - left aligned
        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        doc.text(resumeData.title, margin, y);
        y += 16;

        // Contact info - left aligned
        const contactParts = [];
        if (resumeData.contact.email) contactParts.push(resumeData.contact.email);
        if (resumeData.contact.phone) contactParts.push(resumeData.contact.phone);
        if (resumeData.contact.location) contactParts.push(resumeData.contact.location);
        if (resumeData.contact.linkedin) contactParts.push(resumeData.contact.linkedin);

        if (contactParts.length > 0) {
            doc.setFontSize(10);
            doc.text(contactParts.join('  |  '), margin, y);
            y += 15;
        }

        // Divider line
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.75);
        doc.line(margin, y, pageWidth - margin, y);
        y += 25;

        // Cover Letter body - Times New Roman, black, left-aligned
        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);

        // Replace placeholder names with the actual user's name
        let processedText = coverLetterText
            .replace(/\[Your Name\]/gi, resumeData.name)
            .replace(/\[Your Full Name\]/gi, resumeData.name)
            .replace(/\[Full Name\]/gi, resumeData.name)
            .replace(/\[Name\]/gi, resumeData.name)
            .replace(/\[Candidate Name\]/gi, resumeData.name);

        // Check if the text already ends with a sign-off (Sincerely, Best regards, etc.)
        const hasSignOff = /\b(sincerely|best regards|regards|warm regards|kind regards|yours truly|respectfully)\s*,?\s*$/im.test(processedText.trim());

        // Split by paragraphs (double newlines) to preserve paragraph spacing
        const paragraphs = processedText.split(/\n\s*\n/);
        paragraphs.forEach((paragraph, pIndex) => {
            const trimmed = paragraph.trim();
            if (!trimmed) return;

            const lines = doc.splitTextToSize(trimmed, contentWidth);
            lines.forEach(line => {
                if (y > pageHeight - margin) {
                    doc.addPage();
                    y = margin;
                }
                doc.text(line, margin, y);
                y += 16;
            });

            // Add paragraph spacing
            y += 8;
        });

        // Sign-off with candidate name (only if text doesn't already end with one)
        if (!hasSignOff) {
            y += 10;
            if (y > pageHeight - margin - 50) {
                doc.addPage();
                y = margin;
            }
            doc.setFont('times', 'normal');
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text('Sincerely,', margin, y);
            y += 24;
            doc.setFont('times', 'bold');
            doc.text(resumeData.name, margin, y);
        }

        const targetCompany = document.getElementById('target-company')?.value.trim();
        
        let filename;
        if (targetCompany) {
            filename = `${targetCompany.replace(/\s+/g, '_')}_CoverLetter.pdf`;
        } else {
            const baseName = name.replace(/\s+/g, '_') || 'Applicant';
            filename = `${baseName}_CoverLetter.pdf`;
        }
        doc.save(filename);
        showMessage('Cover Letter PDF generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating Cover Letter PDF:', error);
        alert('PDF Error: ' + error.message);
        showMessage('Failed to generate Cover Letter PDF: ' + error.message, 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
    }
}

function collectResumeData() {
    const data = {
        template: document.getElementById('resume-template').value,
        name: document.getElementById('resume-name').value.trim(),
        title: document.getElementById('resume-title').value.trim(),
        contact: {
            email: document.getElementById('contact-email').value.trim(),
            phone: document.getElementById('contact-phone').value.trim(),
            location: document.getElementById('contact-location').value.trim(),
            linkedin: document.getElementById('contact-linkedin').value.trim()
        },
        profile: {
            enabled: document.getElementById('profile-enabled').checked,
            content: document.getElementById('profile-text').value.trim()
        },
        skills: {
            enabled: document.getElementById('skills-enabled').checked,
            items: []
        },
        education: {
            enabled: document.getElementById('education-enabled').checked,
            items: []
        },
        experience: {
            enabled: document.getElementById('experience-enabled').checked,
            items: []
        },
        achievements: {
            enabled: document.getElementById('achievements-enabled').checked,
            items: []
        },
        languages: {
            enabled: document.getElementById('languages-enabled').checked,
            items: []
        },
        reference: {
            enabled: document.getElementById('reference-enabled').checked,
            content: document.getElementById('reference-text').value.trim()
        },
        coverLetter: {
            enabled: document.getElementById('cover-letter-enabled').checked,
            content: document.getElementById('cover-letter-text').value.trim()
        }
    };

    // Always collect achievements (regardless of toggle)
    const achievementCards = document.querySelectorAll('#achievements-list .item-card');
    achievementCards.forEach(card => {
        const input = card.querySelector('input[name="achievement"]');
        if (input && input.value.trim()) {
            data.achievements.items.push(input.value.trim());
        }
    });

    // Always collect languages
    const languageCards = document.querySelectorAll('#languages-list .item-card');
    languageCards.forEach(card => {
        const input = card.querySelector('input[name="language"]');
        if (input && input.value.trim()) {
            data.languages.items.push(input.value.trim());
        }
    });

    // Always collect skills with descriptions
    const skillCards = document.querySelectorAll('#skills-list .item-card');
    skillCards.forEach(card => {
        const nameInput = card.querySelector('input[name="skill-name"]');
        const descInput = card.querySelector('input[name="skill-desc"]');
        const name = nameInput ? nameInput.value.trim() : '';
        const desc = descInput ? descInput.value.trim() : '';
        if (name) {
            // Format: "Skill Name - Description" or just "Skill Name" if no description
            data.skills.items.push(desc ? `${name} - ${desc}` : name);
        }
    });

    // Always collect education
    const educationCards = document.querySelectorAll('#education-list .item-card');
    educationCards.forEach(card => {
        const inputs = card.querySelectorAll('input[name]');
        const edu = {};
        inputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                edu[input.name] = value;
            }
        });
        if (Object.keys(edu).length > 0) {
            data.education.items.push(edu);
        }
    });

    // Always collect experience
    const experienceCards = document.querySelectorAll('#experience-list .item-card');
    experienceCards.forEach(card => {
        const inputs = card.querySelectorAll('input[name]');
        const exp = {
            responsibilities: []
        };
        inputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                exp[input.name] = value;
            }
        });

        // Collect responsibilities
        const respInputs = card.querySelectorAll('.responsibility-item input');
        respInputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                exp.responsibilities.push(value);
            }
        });

        if (Object.keys(exp).length > 1 || exp.responsibilities.length > 0) {
            data.experience.items.push(exp);
        }
    });

    return data;
}

function showMessage(message, type) {
    // Remove existing messages
    const existing = document.querySelector('.success-message, .error-message');
    if (existing) {
        existing.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;

    const actionButtons = document.querySelector('.action-buttons');
    actionButtons.insertBefore(messageDiv, actionButtons.firstChild);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Make functions available globally for onclick handlers
window.removeItem = removeItem;
window.addResponsibility = addResponsibility;
window.saveEducation = saveEducation;
window.saveExperience = saveExperience;
window.saveSkills = saveSkills;
window.saveAchievements = saveAchievements;
window.saveLanguages = saveLanguages;
window.handleSignOut = handleSignOut;
window.addSkillItem = addSkillItem;
window.addEducationItem = addEducationItem;
window.addExperienceItem = addExperienceItem;
window.addAchievementItem = addAchievementItem;
window.addLanguageItem = addLanguageItem;
window.generateResumePDF = generateResumePDF;
window.generateCoverLetterPDF = generateCoverLetterPDF;
window.analyzeJobDescription = analyzeJobDescription;
window.regenerateSection = regenerateSection;

// ---- OPENROUTER HELPER ----
async function callOpenRouter(apiKey, prompt) {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": window.location.origin, // Required for OpenRouter
                "X-Title": "AI Resume Builder", // Optional
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "google/gemini-2.0-flash-001", // Using Gemini 2.0 via OpenRouter for high speed/low cost
                "messages": [
                    { "role": "user", "content": prompt }
                ]
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message || "OpenRouter error");
        return data.choices[0].message.content;
    } catch (error) {
        console.error("OpenRouter Error:", error);
        throw error;
    }
}

window.humanizeCoverLetter = humanizeCoverLetter;
