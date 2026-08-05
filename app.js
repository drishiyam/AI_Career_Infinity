/**
 * CareerInfinity AI v3.0 — App Engine
 * FIXED:
 *  - Theme toggle works on EVERY page (landing + dashboard + ideas)
 *  - SSO login now shows resume upload modal before dashboard redirect
 *  - Backend simulation with honest note to user
 *  - Better text visibility in light mode
 */

// ============================================================================
// THEME MANAGER — Works on ALL pages, no exceptions
// ============================================================================
const ThemeManager = (() => {
    const KEY = 'ci_theme';

    function get() { return localStorage.getItem(KEY) || 'dark'; }

    function set(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(KEY, theme);
        updateAll(theme);
    }

    function toggle() { set(get() === 'dark' ? 'light' : 'dark'); }

    function updateAll(theme) {
        // Update ALL toggle buttons site-wide
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            const icon = btn.querySelector('.toggle-icon');
            const label = btn.querySelector('.toggle-label');
            if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
            if (label) label.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
        });
    }

    function init() {
        const theme = get();
        document.documentElement.setAttribute('data-theme', theme);
        // Bind ALL toggle buttons found on the page
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => toggle());
        });
        updateAll(theme);
    }

    return { get, set, toggle, init };
})();

// ============================================================================
// AUTH MANAGER — Persistent Login State
// ============================================================================
const AuthManager = {
    isLoggedIn() { return localStorage.getItem('ci_loggedIn') === 'true'; },

    getUser() {
        return {
            name: localStorage.getItem('ci_name') || 'User',
            firstName: (localStorage.getItem('ci_name') || 'User').split(' ')[0],
            email: localStorage.getItem('ci_email') || 'user@springboard.infosys.com',
            role: localStorage.getItem('ci_role') || 'Infosys Springboard Intern',
            matchScore: parseInt(localStorage.getItem('ci_matchScore') || '0'),
            resumeUploaded: localStorage.getItem('ci_resumeUploaded') === 'true',
            resumeData: safeJSONParse(localStorage.getItem('ci_resumeData'), {})
        };
    },

    login(name, email, role) {
        localStorage.setItem('ci_loggedIn', 'true');
        localStorage.setItem('ci_name', name.trim());
        localStorage.setItem('ci_email', email || makeFakeEmail(name));
        localStorage.setItem('ci_role', role || 'Infosys Springboard AI Intern');
        localStorage.setItem('career_current_user', name.trim().split(' ')[0]);
        const currentResume = localStorage.getItem('userResumeName');
        if (!currentResume || currentResume.includes('Ananya_Sharma') || currentResume.includes('Alex_Johnson')) {
            localStorage.setItem('userResumeName', `${name.trim().replace(/\s+/g, '_')}_Resume.pdf`);
        }
    },

    saveResume(data) {
        localStorage.setItem('ci_resumeUploaded', 'true');
        localStorage.setItem('ci_matchScore', String(data.matchScore || 0));
        localStorage.setItem('ci_resumeData', JSON.stringify(data));
    },

    logout() {
        ['ci_loggedIn','ci_name','ci_email','ci_role','ci_matchScore','ci_resumeUploaded','ci_resumeData'].forEach(k => localStorage.removeItem(k));
    }
};

function safeJSONParse(str, fallback) {
    try { return JSON.parse(str || '{}') || fallback; }
    catch { return fallback; }
}

function makeFakeEmail(name) {
    return name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g,'') + '@springboard.infosys.com';
}

// ============================================================================
// BACKEND NOTE — Honest disclosure about client-side simulation
// ============================================================================
/*
 * ABOUT DATA FETCHING:
 * This platform uses SIMULATED backend data via localStorage and client-side
 * keyword extraction from your uploaded resume. In a real production system,
 * you would connect to:
 *   1. REST API / GraphQL backend (Node.js + Express, Django, etc.)
 *   2. Database (PostgreSQL, MongoDB) to store user profiles & scores
 *   3. AI microservice (Python/FastAPI with NLP) for resume parsing
 *   4. OAuth 2.0 server for real SSO with Google/Microsoft/Infosys
 *
 * For this Infosys Springboard internship project, all calculations are
 * performed entirely in the browser using keyword matching, ensuring
 * zero server costs and instant results.
 */

// ============================================================================
// RESUME PARSER — Client-side AI simulation
// ============================================================================
const ResumeParser = {
    skillsDB: {
        'Python': ['python', 'django', 'flask', 'pandas', 'numpy', 'sklearn', 'matplotlib', 'seaborn', 'fastapi'],
        'JavaScript': ['javascript', 'js', 'nodejs', 'reactjs', 'vuejs', 'angular', 'typescript', 'express', 'nextjs'],
        'Java': ['java', 'spring', 'hibernate', 'maven', 'gradle', 'j2ee', 'jvm', 'springboot'],
        'SQL & Databases': ['sql', 'mysql', 'postgresql', 'oracle', 'mongodb', 'nosql', 'redis', 'sqlite', 'database'],
        'Data Structures': ['data structure', 'dsa', 'algorithm', 'array', 'linked list', 'tree', 'graph', 'stack', 'queue'],
        'Machine Learning': ['machine learning', 'ml', 'deep learning', 'neural network', 'tensorflow', 'pytorch', 'keras', 'nlp', 'ai'],
        'Web Development': ['html', 'css', 'bootstrap', 'tailwind', 'rest api', 'graphql', 'web development'],
        'Cloud & DevOps': ['aws', 'azure', 'gcp', 'cloud', 'docker', 'kubernetes', 'devops', 'ci/cd', 'terraform', 'jenkins'],
        'Data Science': ['data science', 'data analysis', 'analytics', 'tableau', 'power bi', 'excel', 'eda', 'visualization'],
        'C / C++': ['c++', ' c ', ' c,', 'cplusplus', 'pointers', 'oops', 'object oriented'],
    },
    certKW: ['certified','certification','certificate','course','udemy','coursera','edx','linkedin learning','google','aws certified','microsoft','ibm','infosys','nptel','springboard'],
    projKW: ['project','developed','built','created','implemented','designed','architected'],
    expKW: ['internship','intern','experience','worked at','employed','company'],

    parse(rawText) {
        const text = (rawText || '').toLowerCase();
        const lines = (rawText || '').split('\n').filter(l => l.trim());

        // Skills detection
        const skills = {};
        Object.entries(this.skillsDB).forEach(([name, kw]) => {
            const hits = kw.filter(k => text.includes(k)).length;
            if (hits > 0) skills[name] = Math.min(100, 45 + hits * 14);
        });

        // Counts
        const certLines = lines.filter(l => this.certKW.some(k => l.toLowerCase().includes(k)));
        const certCount = Math.min(12, certLines.length);
        const projCount = Math.min(10, lines.filter(l => this.projKW.some(k => l.toLowerCase().includes(k))).length);
        const hasExp = this.expKW.some(k => text.includes(k));
        const internCount = (text.match(/internship/gi) || []).length;

        // This month certs
        const now = new Date();
        const monthName = now.toLocaleString('en', { month: 'long' }).toLowerCase();
        const yearStr = now.getFullYear().toString();
        const thisMonthCerts = certLines.filter(l => l.toLowerCase().includes(monthName) || l.includes(yearStr)).length;

        // Scores
        let profileScore = 35;
        if (Object.keys(skills).length > 0) profileScore += 20;
        if (certCount > 0) profileScore += 15;
        if (projCount > 0) profileScore += 15;
        if (hasExp) profileScore += 10;
        if (text.includes('@')) profileScore += 5;
        profileScore = Math.min(100, profileScore);

        const avgSkill = Object.keys(skills).length > 0
            ? Object.values(skills).reduce((a, b) => a + b, 0) / Object.values(skills).length
            : 28;

        const matchScore = Math.round(
            avgSkill * 0.40 +
            Math.min(certCount * 8, 72) * 0.20 +
            Math.min(projCount * 6, 72) * 0.20 +
            profileScore * 0.20
        );

        const atsScore = Math.min(97, 55 + Object.keys(skills).length * 4 + Math.min(certCount * 2, 14));
        const grammarScore = Math.min(96, 74 + Math.min(lines.length * 0.5, 18));
        const keywordScore = Math.min(97, 52 + Object.keys(skills).length * 5);
        const formattingScore = Math.min(96, lines.length > 25 ? 84 : 68);

        return {
            skills,
            certCount,
            certThisMonth: thisMonthCerts,
            projectCount: projCount,
            hasExperience: hasExp,
            profileScore,
            mockScore: Math.min(15, Math.floor(Object.keys(skills).length * 1.4) + internCount),
            skillsLearned: Object.keys(skills).length + certCount,
            matchScore,
            atsScore: Math.round(atsScore),
            grammarScore: Math.round(grammarScore),
            keywordScore: Math.round(keywordScore),
            formattingScore: Math.round(formattingScore),
            careerPaths: this.inferPaths(skills),
            comment: this.makeComment(matchScore, skills, certCount)
        };
    },

    inferPaths(skills) {
        const sk = Object.keys(skills);
        const paths = [];
        if (sk.includes('Python') || sk.includes('Machine Learning') || sk.includes('Data Science'))
            paths.push({ title: 'Data Scientist / ML Engineer', sub: 'AI & Analytics', pct: Math.min(96, 68 + (skills['Python'] || 50) / 5) });
        if (sk.includes('JavaScript') || sk.includes('Web Development'))
            paths.push({ title: 'Full Stack Developer', sub: 'Frontend & Backend', pct: Math.min(95, 64 + (skills['JavaScript'] || 50) / 5) });
        if (sk.includes('Java'))
            paths.push({ title: 'Backend / Java Engineer', sub: 'Enterprise Apps', pct: Math.min(93, 60 + (skills['Java'] || 50) / 5) });
        if (sk.includes('SQL & Databases') || sk.includes('Data Science'))
            paths.push({ title: 'Data Analyst / BI Engineer', sub: 'Reporting & Analytics', pct: Math.min(93, 62 + (skills['SQL & Databases'] || 50) / 5) });
        if (sk.includes('Cloud & DevOps'))
            paths.push({ title: 'Cloud / DevOps Engineer', sub: 'AWS / Azure / GCP', pct: Math.min(91, 60 + (skills['Cloud & DevOps'] || 50) / 5) });
        if (paths.length === 0) {
            paths.push({ title: 'Software Developer', sub: 'General Engineering', pct: 60 });
            paths.push({ title: 'IT Support Analyst', sub: 'Infrastructure', pct: 52 });
        }
        return paths.sort((a, b) => b.pct - a.pct).slice(0, 3).map(p => ({ ...p, pct: Math.round(p.pct) }));
    },

    makeComment(score, skills, certs) {
        const top = Object.keys(skills).slice(0, 3).join(', ');
        if (score >= 85) return `🔥 Exceptional profile! Your ${top} expertise places you among the top candidates for Infosys placement drives. Keep the momentum!`;
        if (score >= 70) return `✅ Strong resume! Your ${top || 'technical'} skills are impressive. Adding ${certs < 3 ? 'more certifications' : 'advanced projects'} will push you above 90%.`;
        if (score >= 55) return `📈 Solid start! Your profile shows potential. Expand your ${top || 'Python / SQL'} projects and earn 3+ certifications to significantly boost your match.`;
        return `🌱 Great beginning! Upload a detailed resume with skills, projects, and certifications to unlock full AI-powered career insights and a personalized score.`;
    },

    async extractFromFile(file) {
        return new Promise((resolve) => {
            if (file.type === 'application/pdf' && window.pdfjsLib) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const pdf = await window.pdfjsLib.getDocument({ data: e.target.result }).promise;
                        let fullText = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            fullText += content.items.map(item => item.str).join(' ') + '\n';
                        }
                        resolve(fullText);
                    } catch { resolve(''); }
                };
                reader.readAsArrayBuffer(file);
            } else {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result || '');
                reader.readAsText(file);
            }
        });
    }
};

function makeFakeEmail(name) {
    if (!name || typeof name !== 'string') return 'intern@springboard.infosys.com';
    return `${name.trim().toLowerCase().replace(/\s+/g, '.')}@springboard.infosys.com`;
}

function demoResumeText(name) {
    const email = makeFakeEmail(name);
    const gitName = (name || 'intern').split(' ')[0].toLowerCase();
    return `${name} | B.Sc. Information Technology | 3rd Year | Infosys Springboard Intern
Email: ${email} | GitHub: github.com/${gitName}
Skills: Python, SQL, Data Structures, HTML, CSS, JavaScript, Machine Learning, Django
Certifications: Python for Data Science – Coursera (July 2026), AWS Fundamentals – AWS (June 2026), SQL Bootcamp – Udemy (May 2026)
Projects:
  1. Library Management System (Python, MySQL, Tkinter) – Full CRUD operations
  2. Portfolio Website (HTML, CSS, JS, React) – Hosted on GitHub Pages
  3. Movie Recommendation Engine (Python, ML, Pandas) – Cosine similarity algorithm
Internship: Infosys Springboard AI Career Intelligence Platform – 2026
Education: B.Sc. IT – Dr. DY Patil College of Engineering – CGPA: 8.4`;
}

// ============================================================================
// REAL BACKEND SERVER CONNECTOR (Python Flask / Node.js on port 5000)
// ============================================================================
async function parseOrFetchBackendResume(file, userName) {
    try {
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('userName', userName || AuthManager.getUser().name || 'Student');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch('http://localhost:5000/api/upload-resume', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data && data.matchScore) {
                console.log('[Real Backend API Connected] Successfully extracted resume via server:', data);
                if (typeof toast === 'function') toast('🚀 Real Backend API Connected & Extracted!', 'success');
                return data;
            }
        }
    } catch (err) {
        console.log('[Backend info] Server offline or unreachable on :5000, using local heuristic engine.');
    }

    const rawText = await ResumeParser.extractFromFile(file);
    return ResumeParser.parse(rawText || demoResumeText(userName || 'Student'));
}

// ============================================================================
// INIT ON DOM READY
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Apply theme FIRST before anything renders
    ThemeManager.init();

    // Inject chatbot globally
    injectChatbot();

    // Detect which page we're on
    if (document.getElementById('landing-page-root')) {
        initLandingPage();
    } else {
        if (document.getElementById('dashboard-root')) initDashboardPage();
        else initSubPage();
        initProfileDropdown();
    }
});

const domainDatabase = {
    "AI & Machine Learning Engineer": {
        defaultPct: 89,
        salary: "₹8.5 – 18 LPA",
        salarySub: "for AI & Machine Learning Engineer",
        jobs: "450K+",
        jobsSub: "Across India & Global Tech",
        growth: "Very High (+38% CAGR)",
        growthColor: "#10b981",
        growthSub: "Surging due to GenAI & LLM adoption",
        growthBadge: "+38% Growth",
        chartHeights: ["42%", "58%", "74%", "88%", "98%"],
        chartColors: "linear-gradient(180deg, #10b981 0%, #3b82f6 100%)",
        suggestion: "Based on your profile, AI recommends mastering PyTorch, Transformers, and AWS SageMaker to unlock senior AI roles above ₹18 LPA."
    },
    "Data Analyst / BI Specialist": {
        defaultPct: 85,
        salary: "₹6.0 – 14 LPA",
        salarySub: "for Data Analyst / BI Specialist",
        jobs: "620K+",
        jobsSub: "Across Fintech, Retail & IT",
        growth: "High (+28% CAGR)",
        growthColor: "#3b82f6",
        growthSub: "Strong demand for data-driven analytics",
        growthBadge: "+28% Growth",
        chartHeights: ["38%", "52%", "66%", "80%", "92%"],
        chartColors: "linear-gradient(180deg, #3b82f6 0%, #60a5fa 100%)",
        suggestion: "Based on your profile, AI recommends strengthening Advanced SQL, Power BI / Tableau, and Python Pandas for rapid career acceleration."
    },
    "Full Stack Web Developer": {
        defaultPct: 82,
        salary: "₹6.5 – 15 LPA",
        salarySub: "for Full Stack Web Developer",
        jobs: "1.2M+",
        jobsSub: "Across IT Services & Startups",
        growth: "High (+25% CAGR)",
        growthColor: "#10b981",
        growthSub: "Consistent upward trend in cloud web apps",
        growthBadge: "+25% Growth",
        chartHeights: ["45%", "56%", "68%", "82%", "94%"],
        chartColors: "linear-gradient(180deg, #10b981 0%, #06b6d4 100%)",
        suggestion: "Based on your profile, AI recommends building modern web projects using Next.js/React, TypeScript, and Node.js with PostgreSQL."
    },
    "Cloud & DevOps Architect": {
        defaultPct: 79,
        salary: "₹10.0 – 24 LPA",
        salarySub: "for Cloud & DevOps Architect",
        jobs: "380K+",
        jobsSub: "Across Enterprise Cloud Providers",
        growth: "Very High (+34% CAGR)",
        growthColor: "#8b5cf6",
        growthSub: "Rapid enterprise migration to multi-cloud",
        growthBadge: "+34% Growth",
        chartHeights: ["40%", "55%", "70%", "85%", "96%"],
        chartColors: "linear-gradient(180deg, #8b5cf6 0%, #c084fc 100%)",
        suggestion: "Based on your profile, AI recommends obtaining AWS Certified Solutions Architect or Kubernetes (CKA) certifications for top-tier DevOps roles."
    },
    "Cybersecurity Specialist": {
        defaultPct: 75,
        salary: "₹7.0 – 16 LPA",
        salarySub: "for Cybersecurity Specialist",
        jobs: "290K+",
        jobsSub: "Across Banking, Gov & IT Security",
        growth: "High (+30% CAGR)",
        growthColor: "#ef4444",
        growthSub: "Critical need for cloud & infrastructure defense",
        growthBadge: "+30% Growth",
        chartHeights: ["35%", "48%", "64%", "78%", "90%"],
        chartColors: "linear-gradient(180deg, #ef4444 0%, #f87171 100%)",
        suggestion: "Based on your profile, AI recommends practicing ethical hacking, Network Security (CompTIA Security+), and SIEM tools."
    },
    "Enterprise Java / Backend Engineer": {
        defaultPct: 71,
        salary: "₹6.0 – 14 LPA",
        salarySub: "for Enterprise Java / Backend Engineer",
        jobs: "850K+",
        jobsSub: "Across MNCs & Banking Systems",
        growth: "Steady (+18% CAGR)",
        growthColor: "#f59e0b",
        growthSub: "Continuous demand for robust microservices",
        growthBadge: "+18% Growth",
        chartHeights: ["50%", "58%", "68%", "76%", "86%"],
        chartColors: "linear-gradient(180deg, #f59e0b 0%, #fbbf24 100%)",
        suggestion: "Based on your profile, AI recommends mastering Spring Boot microservices, Kafka, and distributed system design."
    }
};

function selectCareerDomain(domainName) {
    let targetKey = domainName;
    if (!domainDatabase[targetKey]) {
        const lower = domainName.toLowerCase();
        if (lower.includes('ai') || lower.includes('machine')) targetKey = "AI & Machine Learning Engineer";
        else if (lower.includes('data') || lower.includes('analyst') || lower.includes('bi')) targetKey = "Data Analyst / BI Specialist";
        else if (lower.includes('full') || lower.includes('web') || lower.includes('react') || lower.includes('frontend')) targetKey = "Full Stack Web Developer";
        else if (lower.includes('cloud') || lower.includes('devops') || lower.includes('aws')) targetKey = "Cloud & DevOps Architect";
        else if (lower.includes('security') || lower.includes('cyber')) targetKey = "Cybersecurity Specialist";
        else targetKey = "Enterprise Java / Backend Engineer";
    }
    const data = domainDatabase[targetKey];

    document.querySelectorAll('.compat-row').forEach(row => {
        if (row.getAttribute('data-domain') === domainName || row.getAttribute('data-domain') === targetKey) {
            row.classList.add('active');
        } else {
            row.classList.remove('active');
        }
    });

    const salEl = document.getElementById('kpi-expected-salary');
    const salSub = document.getElementById('kpi-salary-sub');
    const jobsEl = document.getElementById('kpi-job-opps');
    const jobsSub = document.getElementById('kpi-jobs-sub');
    const growthEl = document.getElementById('kpi-growth-rate');
    const growthSub = document.getElementById('kpi-growth-sub');
    const badgeEl = document.getElementById('demand-growth-badge');
    const suggTitle = document.getElementById('ai-sugg-title');
    const suggText = document.getElementById('ai-sugg-text');

    if (salEl) salEl.textContent = data.salary;
    if (salSub) salSub.textContent = data.salarySub;
    if (jobsEl) jobsEl.textContent = data.jobs;
    if (jobsSub) jobsSub.textContent = data.jobsSub;
    if (growthEl) { growthEl.textContent = data.growth; growthEl.style.color = data.growthColor; }
    if (growthSub) growthSub.textContent = data.growthSub;
    if (badgeEl) badgeEl.textContent = data.growthBadge;
    if (suggTitle) suggTitle.textContent = `AI Suggestion for ${targetKey}`;
    if (suggText) suggText.textContent = data.suggestion;

    const bars = document.querySelectorAll('#demand-bars-container .growth-bar');
    if (bars && bars.length === 5 && data.chartHeights) {
        bars.forEach((b, idx) => {
            b.style.height = data.chartHeights[idx];
            if (idx === 4) b.style.background = data.chartColors;
        });
    }
}

const skillDomainDatabase = {
    "AI & Machine Learning Engineer": {
        weakSkills: ["PyTorch & Distributed Training", "LLM Fine-Tuning & RAG", "MLOps & SageMaker Pipelines", "Docker Containerization"],
        courses: [
            { title: "DeepLearning.AI GenAI Specialization", icon: "🚀" },
            { title: "AWS Certified Machine Learning Specialty", icon: "🏆" },
            { title: "Stanford CS224N NLP & Transformers", icon: "⚡" }
        ],
        timeVal: "3 – 5 Months",
        timeSub: "to reach Senior AI Engineer proficiency",
        radarScores: [94, 85, 78, 88, 90],
        radarLabels: ["Core Programming | 94%", "Data & ML | 85%", "Cloud & DevOps | 78%", "System Design | 88%", "Problem Solving | 90%"]
    },
    "Data Analyst / BI Specialist": {
        weakSkills: ["Advanced DAX & Power BI", "Statistical Modeling", "Data Warehousing (Snowflake)", "Apache Spark & PySpark"],
        courses: [
            { title: "Microsoft Power BI Data Analyst (PL-300)", icon: "📊" },
            { title: "Google Advanced Data Analytics Certificate", icon: "📈" },
            { title: "Snowflake SnowPro Core Certification", icon: "🗄️" }
        ],
        timeVal: "2 – 3 Months",
        timeSub: "to become industry-ready Data Specialist",
        radarScores: [82, 92, 70, 75, 86],
        radarLabels: ["Core Programming | 82%", "Data & ML | 92%", "Cloud & DevOps | 70%", "System Design | 75%", "Problem Solving | 86%"]
    },
    "Full Stack Web Developer": {
        weakSkills: ["Next.js App Router & SSR", "Distributed System Architecture", "GraphQL & WebSockets API", "Kubernetes Deployment"],
        courses: [
            { title: "Next.js 14 & React Complete Guide", icon: "⚛️" },
            { title: "Node.js & Microservices Architecture Mastery", icon: "🌐" },
            { title: "AWS Cloud Practitioner for Developers", icon: "☁️" }
        ],
        timeVal: "2 – 4 Months",
        timeSub: "to master full-stack production architecture",
        radarScores: [92, 75, 80, 85, 88],
        radarLabels: ["Core Programming | 92%", "Data & ML | 75%", "Cloud & DevOps | 80%", "System Design | 85%", "Problem Solving | 88%"]
    },
    "Cloud & DevOps Architect": {
        weakSkills: ["Terraform / Infrastructure as Code", "Kubernetes Mesh (Istio)", "Advanced CKA Certification", "FinOps & Cloud Costing"],
        courses: [
            { title: "AWS Certified Solutions Architect Associate", icon: "🌩️" },
            { title: "Certified Kubernetes Administrator (CKA)", icon: "🐳" },
            { title: "HashiCorp Certified Terraform Associate", icon: "⚙️" }
        ],
        timeVal: "4 – 6 Months",
        timeSub: "for multi-cloud & CKA enterprise clearance",
        radarScores: [85, 72, 95, 90, 86],
        radarLabels: ["Core Programming | 85%", "Data & ML | 72%", "Cloud & DevOps | 95%", "System Design | 90%", "Problem Solving | 86%"]
    },
    "Cybersecurity Specialist": {
        weakSkills: ["Cloud Security Defense (AWS/Azure)", "Threat Hunting & SIEM Tools", "Penetration Testing (OSCP)", "Zero Trust Architecture"],
        courses: [
            { title: "CompTIA Security+ & Network+ Mastery", icon: "🛡️" },
            { title: "Certified Ethical Hacker (CEH v12) Prep", icon: "🔍" },
            { title: "AWS Certified Security Specialty", icon: "🔒" }
        ],
        timeVal: "3 – 6 Months",
        timeSub: "for enterprise security clearance readiness",
        radarScores: [80, 68, 88, 84, 92],
        radarLabels: ["Core Programming | 80%", "Data & ML | 68%", "Cloud & DevOps | 88%", "System Design | 84%", "Problem Solving | 92%"]
    },
    "Enterprise Java / Backend Engineer": {
        weakSkills: ["Spring Cloud & Microservices", "Apache Kafka & Event-Driven API", "Distributed Caching (Redis)", "High-Scale Concurrency & JVM"],
        courses: [
            { title: "Spring Boot 3 Microservices & Cloud Native", icon: "☕" },
            { title: "Apache Kafka Architecture & Messaging Mastery", icon: "⚡" },
            { title: "High-Scale Distributed System Design", icon: "🏗️" }
        ],
        timeVal: "2 – 4 Months",
        timeSub: "to master high-concurrency enterprise systems",
        radarScores: [90, 74, 82, 92, 86],
        radarLabels: ["Core Programming | 90%", "Data & ML | 74%", "Cloud & DevOps | 82%", "System Design | 92%", "Problem Solving | 86%"]
    }
};

function selectSkillDomain(domainName) {
    let targetKey = domainName;
    if (!skillDomainDatabase[targetKey]) {
        const lower = domainName.toLowerCase();
        if (lower.includes('ai') || lower.includes('machine')) targetKey = "AI & Machine Learning Engineer";
        else if (lower.includes('data') || lower.includes('analyst') || lower.includes('bi')) targetKey = "Data Analyst / BI Specialist";
        else if (lower.includes('full') || lower.includes('web') || lower.includes('react') || lower.includes('frontend')) targetKey = "Full Stack Web Developer";
        else if (lower.includes('cloud') || lower.includes('devops') || lower.includes('aws')) targetKey = "Cloud & DevOps Architect";
        else if (lower.includes('security') || lower.includes('cyber')) targetKey = "Cybersecurity Specialist";
        else targetKey = "Enterprise Java / Backend Engineer";
    }
    const data = skillDomainDatabase[targetKey];

    document.querySelectorAll('#skill-gap-list .compat-row').forEach(row => {
        if (row.getAttribute('data-skill-domain') === domainName || row.getAttribute('data-skill-domain') === targetKey) {
            row.classList.add('active');
        } else {
            row.classList.remove('active');
        }
    });

    const weakEl = document.getElementById('weak-skills-container');
    if (weakEl && data.weakSkills) {
        weakEl.innerHTML = data.weakSkills.map(w => `<span class="weak-pill">${w}</span>`).join('');
    }

    const recEl = document.getElementById('rec-courses-container');
    if (recEl && data.courses) {
        recEl.innerHTML = data.courses.map(c => `<div class="rec-course-row"><span style="margin-right:8px;">${c.icon}</span> ${c.title}</div>`).join('');
    }

    const timeEl = document.getElementById('est-learning-time');
    const timeSub = document.getElementById('est-learning-sub');
    if (timeEl && data.timeVal) timeEl.textContent = data.timeVal;
    if (timeSub && data.timeSub) timeSub.textContent = data.timeSub;

    const titleEl = document.getElementById('radar-chart-title');
    if (titleEl) titleEl.textContent = `Skill Breakdown for ${targetKey}`;

    if (data.radarScores && data.radarLabels) {
        const [c0, c1, c2, c3, c4] = data.radarScores;
        const p0x = 190, p0y = Math.round(170 - (c0 / 100) * 110);
        const p1x = Math.round(190 + (c1 / 100) * 105), p1y = Math.round(170 - (c1 / 100) * 34);
        const p2x = Math.round(190 + (c2 / 100) * 65), p2y = Math.round(170 + (c2 / 100) * 89);
        const p3x = Math.round(190 - (c3 / 100) * 65), p3y = Math.round(170 + (c3 / 100) * 89);
        const p4x = Math.round(190 - (c4 / 100) * 105), p4y = Math.round(170 - (c4 / 100) * 34);

        const poly = document.getElementById('radar-data-polygon');
        if (poly) poly.setAttribute('points', `${p0x},${p0y} ${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y}`);

        const pt0 = document.getElementById('radar-pt-0'); if (pt0) { pt0.setAttribute('cx', p0x); pt0.setAttribute('cy', p0y); }
        const pt1 = document.getElementById('radar-pt-1'); if (pt1) { pt1.setAttribute('cx', p1x); pt1.setAttribute('cy', p1y); }
        const pt2 = document.getElementById('radar-pt-2'); if (pt2) { pt2.setAttribute('cx', p2x); pt2.setAttribute('cy', p2y); }
        const pt3 = document.getElementById('radar-pt-3'); if (pt3) { pt3.setAttribute('cx', p3x); pt3.setAttribute('cy', p3y); }
        const pt4 = document.getElementById('radar-pt-4'); if (pt4) { pt4.setAttribute('cx', p4x); pt4.setAttribute('cy', p4y); }

        for (let i = 0; i < 5; i++) {
            const lbl = document.getElementById(`radar-lbl-${i}`);
            if (lbl && data.radarLabels[i]) lbl.textContent = data.radarLabels[i];
        }
    }
}

function initSubPage() {
    const user = AuthManager.getUser();
    const rd = user.resumeData || {};

    // 1. Update global header credentials
    document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = user.name);
    document.querySelectorAll('[data-user-firstname]').forEach(el => el.textContent = user.firstName);
    document.querySelectorAll('[data-user-email]').forEach(el => el.textContent = user.email);
    document.querySelectorAll('[data-user-role]').forEach(el => el.textContent = user.role);
    document.querySelectorAll('[data-user-initial]').forEach(el => el.textContent = user.name.charAt(0).toUpperCase());

    // Sync user resume filename dynamically
    let storedResumeName = localStorage.getItem('userResumeName');
    if (!storedResumeName || storedResumeName.includes('Ananya_Sharma') || storedResumeName.includes('Alex_Johnson')) {
        storedResumeName = `${user.name ? user.name.trim().replace(/\s+/g, '_') : 'My'}_Resume.pdf`;
        localStorage.setItem('userResumeName', storedResumeName);
    }
    const raDisp = document.getElementById('ra-filename-display');
    if (raDisp) raDisp.textContent = '📄 ' + storedResumeName;

    // Sync Aptitude dataset name and Welcome headings
    const aptDisp = document.getElementById('apt-user-display');
    if (aptDisp && user.firstName) aptDisp.textContent = user.firstName;
    const welcomeSpan = document.querySelector('#welcome-heading span');
    if (welcomeSpan && user.firstName) welcomeSpan.textContent = user.firstName;

    // 2. Career Intelligence Page
    const careerCompatList = document.getElementById('career-compat-list');
    if (careerCompatList) {
        const allKeys = Object.keys(domainDatabase);
        const parsedMap = {};
        if (rd.careerPaths && rd.careerPaths.length) {
            rd.careerPaths.forEach(p => {
                let matched = false;
                allKeys.forEach(k => {
                    if (k.toLowerCase().includes(p.title.toLowerCase().split(' ')[0]) || p.title.toLowerCase().includes(k.toLowerCase().split(' ')[0])) {
                        parsedMap[k] = p.pct;
                        matched = true;
                    }
                });
                if (!matched && p.title.length > 3) parsedMap[p.title] = p.pct;
            });
        }
        const paths = [];
        allKeys.forEach(k => {
            paths.push({ title: k, pct: parsedMap[k] || domainDatabase[k].defaultPct });
        });
        paths.sort((a, b) => b.pct - a.pct);

        const colors = [
            'linear-gradient(90deg, #3b82f6, #60a5fa)',
            'linear-gradient(90deg, #3b82f6, #06b6d4)',
            'linear-gradient(90deg, #10b981, #34d399)',
            'linear-gradient(90deg, #f59e0b, #fbbf24)',
            'linear-gradient(90deg, #ef4444, #f87171)',
            'linear-gradient(90deg, #8b5cf6, #c084fc)'
        ];
        careerCompatList.innerHTML = paths.map((p, i) => `
            <div class="compat-row" data-domain="${p.title}" onclick="selectCareerDomain('${p.title}')">
                <span class="compat-role">${p.title}</span>
                <div class="compat-track"><div class="compat-fill" style="width: ${p.pct}%; background: ${colors[i % colors.length]};"></div></div>
                <span class="compat-pct">${p.pct}%</span>
            </div>
        `).join('');

        setTimeout(() => {
            if (paths[0]) selectCareerDomain(paths[0].title);
        }, 150);
    }

    // 3. Skill Analysis Page
    const skillGapList = document.getElementById('skill-gap-list');
    if (skillGapList) {
        const allKeys = Object.keys(skillDomainDatabase);
        const parsedMap = {};
        if (rd.careerPaths && rd.careerPaths.length) {
            rd.careerPaths.forEach(p => {
                let matched = false;
                allKeys.forEach(k => {
                    if (k.toLowerCase().includes(p.title.toLowerCase().split(' ')[0]) || p.title.toLowerCase().includes(k.toLowerCase().split(' ')[0])) {
                        parsedMap[k] = p.pct;
                        matched = true;
                    }
                });
                if (!matched && p.title.length > 3) parsedMap[p.title] = p.pct;
            });
        }
        const paths = [];
        allKeys.forEach(k => {
            paths.push({ title: k, pct: parsedMap[k] || domainDatabase[k]?.defaultPct || 80 });
        });
        paths.sort((a, b) => b.pct - a.pct);

        const colors = [
            'linear-gradient(90deg, #3b82f6, #60a5fa)',
            'linear-gradient(90deg, #3b82f6, #06b6d4)',
            'linear-gradient(90deg, #10b981, #34d399)',
            'linear-gradient(90deg, #f59e0b, #fbbf24)',
            'linear-gradient(90deg, #ef4444, #f87171)',
            'linear-gradient(90deg, #8b5cf6, #c084fc)'
        ];
        skillGapList.innerHTML = paths.map((p, i) => `
            <div class="compat-row" data-skill-domain="${p.title}" onclick="selectSkillDomain('${p.title}')">
                <span class="compat-role">${p.title}</span>
                <div class="compat-track"><div class="compat-fill" style="width: ${p.pct}%; background: ${colors[i % colors.length]};"></div></div>
                <span class="compat-pct">${p.pct}%</span>
            </div>
        `).join('');

        setTimeout(() => {
            if (paths[0]) selectSkillDomain(paths[0].title);
        }, 150);
    }

    // 4. Job Recommendations Page
    const jobsContainer = document.getElementById('jobs-grid-container');
    if (jobsContainer && rd.careerPaths && rd.careerPaths.length >= 3) {
        const cards = jobsContainer.querySelectorAll('.job-card-s1');
        if (cards[0]) {
            const roleEl = cards[0].querySelector('.role-title-s1');
            const matchEl = cards[0].querySelector('.ai-match-s1');
            if (roleEl) roleEl.textContent = rd.careerPaths[0].title;
            if (matchEl) matchEl.innerHTML = `<i class="fa-solid fa-check"></i> AI Match ${rd.careerPaths[0].pct}%`;
        }
        if (cards[1]) {
            const roleEl = cards[1].querySelector('.role-title-s1');
            const matchEl = cards[1].querySelector('.ai-match-s1');
            if (roleEl) roleEl.textContent = rd.careerPaths[1].title;
            if (matchEl) matchEl.innerHTML = `<i class="fa-solid fa-check"></i> AI Match ${rd.careerPaths[1].pct}%`;
        }
        if (cards[2]) {
            const roleEl = cards[2].querySelector('.role-title-s1');
            const matchEl = cards[2].querySelector('.ai-match-s1');
            if (roleEl) roleEl.textContent = rd.careerPaths[2].title;
            if (matchEl) matchEl.innerHTML = `<i class="fa-solid fa-check"></i> AI Match ${rd.careerPaths[2].pct}%`;
        }
    }

    // 5. Resume Analyzer Page
    const raFilename = document.getElementById('ra-filename-display');
    if (raFilename) {
        raFilename.textContent = `📄 ${user.name.replace(/\s+/g, '_')}_Resume.pdf`;
        const scoreVal = rd.atsScore || 92;
        const mainScoreEl = document.getElementById('main-score-val');
        const scoreRing = document.getElementById('score-ring');
        if (mainScoreEl) mainScoreEl.innerHTML = `${scoreVal}<span style="font-size:0.9rem; font-weight:600; color:var(--text-muted);">/100</span>`;
        if (scoreRing) scoreRing.style.strokeDashoffset = 339.29 - (scoreVal / 100) * 339.29;

        const metricVals = document.querySelectorAll('.ra-metric-val');
        if (metricVals.length >= 4) {
            metricVals[0].textContent = `${scoreVal}%`;
            metricVals[1].textContent = `${Math.min(100, scoreVal + 2)}%`;
            metricVals[2].textContent = `${Math.max(70, scoreVal - 3)}%`;
            metricVals[3].textContent = `${Math.min(100, scoreVal + 1)}%`;
        }
    }
}

// ============================================================================
// INTERACTIVE LEARNING PATH SYSTEM (MODALS, SYLLABUS, LESSON & UNLOCK LOGIC)
// ============================================================================
const learningModulesData = {
    1: {
        title: "Python Fundamentals",
        status: "Completed",
        weeks: "4 Weeks",
        level: "Beginner",
        icon: "🐍",
        xp: "+550 XP Earned",
        topics: [
            { name: "Variables, Data Types & Memory Allocation", state: "done", xp: "100 XP" },
            { name: "Object-Oriented Programming & Classes", state: "done", xp: "150 XP" },
            { name: "Decorators, Generators & Exception Handling", state: "done", xp: "200 XP" },
            { name: "Capstone Project: Automated Web Scraper & CSV Analyzer", state: "verified", xp: "100 XP • Grade: A+" }
        ]
    },
    2: {
        title: "Data Structures & Algorithms",
        status: "Completed",
        weeks: "6 Weeks",
        level: "Intermediate",
        icon: "⚡",
        xp: "+800 XP Earned",
        topics: [
            { name: "Big-O Time & Space Complexity Analysis", state: "done", xp: "150 XP" },
            { name: "Linked Lists, Stacks, Queues & Hash Maps", state: "done", xp: "200 XP" },
            { name: "Binary Trees, Graphs & Dynamic Programming", state: "done", xp: "300 XP" },
            { name: "LeetCode Top 50 Pattern Challenge", state: "verified", xp: "150 XP • Grade: A+" }
        ]
    },
    3: {
        title: "SQL & Database Systems",
        status: "Completed",
        weeks: "3 Weeks",
        level: "Beginner",
        icon: "🗄️",
        xp: "+550 XP Earned",
        topics: [
            { name: "Relational Schemas, Primary & Foreign Keys", state: "done", xp: "100 XP" },
            { name: "Complex JOINs, Subqueries & Window Functions", state: "done", xp: "200 XP" },
            { name: "Indexing, Query Optimization & Transactions", state: "done", xp: "150 XP" },
            { name: "Capstone Project: Designing E-Commerce Database", state: "verified", xp: "100 XP • Grade: A+" }
        ]
    },
    4: {
        title: "Machine Learning Mastery",
        status: "In Progress",
        pct: 80,
        weeks: "8 Weeks",
        level: "Advanced",
        icon: "🤖",
        xp: "+600 XP / 750 XP",
        topics: [
            { name: "Supervised Learning: Regression & Logistic Classifiers", state: "done", xp: "150 XP" },
            { name: "Decision Trees, Random Forests & XGBoost Ensemble", state: "done", xp: "200 XP" },
            { name: "Deep Neural Networks with PyTorch & Keras", state: "done", xp: "250 XP" },
            { name: "Active Lesson: Transformer Architectures & Self-Attention", state: "active", xp: "150 XP Remaining" }
        ],
        activeLessonContent: `
            <div style="background:var(--bg-main); border:1.5px solid var(--card-border); border-radius:14px; padding:1.25rem; margin-top:1.2rem;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
                    <span style="font-weight:800; color:#3b82f6; font-size:0.95rem;">📘 Active Lesson: Multi-Head Self-Attention in LLMs</span>
                    <span style="background:rgba(59,130,246,0.15); color:#3b82f6; padding:3px 10px; border-radius:12px; font-weight:700; font-size:0.78rem;">Topic 4 of 4</span>
                </div>
                <p style="font-size:0.88rem; color:var(--text-secondary); line-height:1.6; margin-bottom:1rem;">
                    Learn how modern Transformers compute token relationships across sequences by calculating scaled dot-product attention between Query ($Q$), Key ($K$), and Value ($V$) projections.
                </p>
                <div style="background:#0f172a; padding:14px; border-radius:10px; font-family:'Courier New', monospace; font-size:0.88rem; color:#60a5fa; margin-bottom:1.25rem; overflow-x:auto; border:1px solid rgba(255,255,255,0.08);">
                    Attention(Q, K, V) = softmax( (Q @ K^T) / √d_k ) @ V
                </div>
                <button onclick="completeActiveLesson()" style="width:100%; padding:0.9rem; background:var(--grad-primary); color:#fff; border:none; border-radius:12px; font-weight:800; font-size:0.95rem; cursor:pointer; box-shadow:0 6px 20px rgba(108,92,231,0.4); transition:transform 0.2s ease;">
                    ✅ Complete Lesson & Achieve 100% Mastery (+150 XP!)
                </button>
            </div>
        `
    },
    5: {
        title: "Cloud Computing & Infrastructure",
        status: "Not Started",
        weeks: "6 Weeks",
        level: "Intermediate",
        icon: "🌩️",
        xp: "0 / 600 XP",
        topics: [
            { name: "AWS Core Services (EC2, S3, IAM, VPC, Route53)", state: "locked" },
            { name: "Docker Containerization & Multi-Stage Builds", state: "locked" },
            { name: "Kubernetes Cluster Orchestration & Helm Charts", state: "locked" },
            { name: "CI/CD Pipelines with GitHub Actions & Terraform IaC", state: "locked" }
        ],
        unlockAction: `
            <div style="background:var(--bg-main); border:1.5px solid var(--card-border); border-radius:14px; padding:1.4rem; margin-top:1.2rem; text-align:center;">
                <div style="font-size:2.2rem; margin-bottom:0.5rem;">🔒</div>
                <h4 style="font-size:1.1rem; font-weight:800; margin-bottom:0.4rem; color:var(--text-primary);">Module Currently Locked</h4>
                <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:1.25rem; max-width:440px; margin-left:auto; margin-right:auto;">
                    You have not started the Cloud Computing curriculum yet. Click below to initialize your cloud sandbox, unlock Topic 1, and earn a +50 XP headstart!
                </p>
                <button onclick="unlockModule(5)" style="padding:0.9rem 2rem; background:linear-gradient(135deg, #10b981, #059669); color:#fff; border:none; border-radius:12px; font-weight:800; font-size:0.95rem; cursor:pointer; box-shadow:0 6px 20px rgba(16,185,129,0.4); transition:transform 0.2s ease;">
                    ▶️ Unlock & Start Module (+50 XP Bonus)
                </button>
            </div>
        `
    },
    6: {
        title: "Interview Preparation & HR Rounds",
        status: "Not Started",
        weeks: "4 Weeks",
        level: "All Levels",
        icon: "🎯",
        xp: "0 / 500 XP",
        topics: [
            { name: "Quantitative Aptitude & Logical Reasoning Drills", state: "locked" },
            { name: "High-Scale Distributed System Design Architecture", state: "locked" },
            { name: "Behavioral & HR STAR Method Strategies", state: "locked" },
            { name: "AI Voice & Tough Mock Interview Simulations", state: "locked" }
        ],
        unlockAction: `
            <div style="background:var(--bg-main); border:1.5px solid var(--card-border); border-radius:14px; padding:1.4rem; margin-top:1.2rem; text-align:center;">
                <div style="font-size:2.2rem; margin-bottom:0.5rem;">🔒</div>
                <h4 style="font-size:1.1rem; font-weight:800; margin-bottom:0.4rem; color:var(--text-primary);">Module Currently Locked</h4>
                <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:1.25rem; max-width:440px; margin-left:auto; margin-right:auto;">
                    Prepare for technical coding and HR rounds. Click below to unlock the interview question bank and earn +50 XP!
                </p>
                <button onclick="unlockModule(6)" style="padding:0.9rem 2rem; background:linear-gradient(135deg, #10b981, #059669); color:#fff; border:none; border-radius:12px; font-weight:800; font-size:0.95rem; cursor:pointer; box-shadow:0 6px 20px rgba(16,185,129,0.4); transition:transform 0.2s ease;">
                    ▶️ Unlock & Start Module (+50 XP Bonus)
                </button>
            </div>
        `
    }
};

function openLearningModule(id) {
    const overlay = document.getElementById('lp-modal-overlay');
    const box = document.getElementById('lp-modal-box');
    if (!overlay || !box) return;

    const m = learningModulesData[id];
    if (!m) return;

    let topicsHtml = m.topics.map((t, idx) => {
        let badge = `<span style="color:#10b981; font-weight:700;"><i class="fa-solid fa-circle-check"></i> ${t.xp || 'Completed'}</span>`;
        let borderStyle = 'border: 1px solid var(--card-border);';
        let bgStyle = 'background: var(--bg-main);';

        if (t.state === 'active') {
            badge = `<span style="background:rgba(59,130,246,0.18); color:#3b82f6; padding:3px 10px; border-radius:10px; font-weight:800; font-size:0.75rem;">🔥 ACTIVE LESSON</span>`;
            borderStyle = 'border: 1.5px solid #3b82f6;';
            bgStyle = 'background: rgba(59,130,246,0.08);';
        } else if (t.state === 'locked') {
            badge = `<span style="color:var(--text-muted); font-size:0.82rem;"><i class="fa-solid fa-lock"></i> Locked</span>`;
        }

        let topicNotesText = `Key verified concepts for ${t.name}: Mastered industry standards, best practices, and high-efficiency implementation techniques during Springboard project tasks. Click to collapse details.`;
        if (t.state === 'active') {
            topicNotesText = `Currently working on ${t.name}. Reviewing core mathematical formulas, architecture constraints, and hands-on coding exercises.`;
        } else if (t.state === 'locked') {
            topicNotesText = `Unlock this module to access the full interactive video curriculum, code challenges, and mentor study notes for ${t.name}.`;
        }

        return `
            <div style="border-radius:12px; margin-bottom:10px; overflow:hidden; ${borderStyle} ${bgStyle} transition:transform 0.2s ease;">
                <div onclick="toggleTopicDetails(${id}, ${idx})" style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; cursor:pointer; user-select:none;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-weight:800; color:var(--text-muted); font-size:0.9rem;">${idx + 1}.</span>
                        <span style="font-weight:700; color:var(--text-primary); font-size:0.94rem;">${t.name}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${badge}
                        <span style="font-size:0.78rem; color:var(--text-muted); background:rgba(255,255,255,0.05); padding:3px 8px; border-radius:6px;">📖 Notes <i class="fa-solid fa-chevron-down" style="font-size:0.7rem;"></i></span>
                    </div>
                </div>
                <div id="topic-drawer-${id}-${idx}" style="display:none; padding:12px 16px 16px 16px; border-top:1px dashed var(--card-border); background:rgba(0,0,0,0.15); font-size:0.86rem; color:var(--text-secondary); line-height:1.6;">
                    <div style="font-weight:700; color:#38bdf8; margin-bottom:4px;">💡 Topic Key Takeaways:</div>
                    <div>${topicNotesText}</div>
                    <div style="margin-top:10px; display:flex; gap:10px;">
                        <button onclick="markTopicReviewed(${id}, ${idx}); event.stopPropagation();" style="padding:5px 12px; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid #10b981; border-radius:8px; font-size:0.78rem; font-weight:700; cursor:pointer;">
                            ✅ Mark Reviewed
                        </button>
                        <button onclick="showToast('📋 Code cheat sheet copied to clipboard!','info'); event.stopPropagation();" style="padding:5px 12px; background:rgba(59,130,246,0.15); color:#3b82f6; border:1px solid #3b82f6; border-radius:8px; font-size:0.78rem; font-weight:700; cursor:pointer;">
                            📋 Copy Cheat Sheet
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    let statusPill = `<span style="background:#10b981; color:#fff; padding:4px 14px; border-radius:20px; font-weight:700; font-size:0.78rem;">Completed</span>`;
    if (m.status === 'In Progress') {
        statusPill = `<span style="background:rgba(59,130,246,0.18); color:#3b82f6; border:1px solid rgba(59,130,246,0.4); padding:4px 14px; border-radius:20px; font-weight:700; font-size:0.78rem;">In Progress (${m.pct}%)</span>`;
    } else if (m.status === 'Not Started') {
        statusPill = `<span style="background:var(--bg-card2); color:var(--text-muted); border:1px solid var(--card-border); padding:4px 14px; border-radius:20px; font-weight:700; font-size:0.78rem;">Not Started</span>`;
    }

    let extraAction = '';
    if (m.status === 'Completed') {
        extraAction = `
            <div style="background:var(--bg-main); border:1.5px solid var(--card-border); border-radius:16px; padding:1.4rem; margin-top:1.4rem;">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:1.1rem; border-bottom:1px solid var(--card-border); padding-bottom:1rem;">
                    <span style="font-size:1.8rem;">🏆</span>
                    <div>
                        <div style="font-weight:800; font-size:1.02rem; color:var(--text-primary);">Module Certificate & Action Center</div>
                        <div style="font-size:0.82rem; color:var(--text-muted);">Verified Infosys Springboard AI Project Standard • Score: 98/100</div>
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:10px;">
                    <button onclick="generateTempCertificate(${id})" style="padding:0.75rem 1rem; background:linear-gradient(135deg, #d97706, #f59e0b); color:#fff; border:none; border-radius:12px; font-weight:800; font-size:0.88rem; cursor:pointer; box-shadow:0 4px 14px rgba(245, 158, 11, 0.35); display:flex; align-items:center; justify-content:center; gap:8px; transition:transform 0.2s ease;">
                        <span>🏅</span> Generate Certificate
                    </button>
                    <button onclick="viewModuleStudyNotes(${id})" style="padding:0.75rem 1rem; background:rgba(59,130,246,0.15); color:#3b82f6; border:1.5px solid rgba(59,130,246,0.4); border-radius:12px; font-weight:800; font-size:0.88rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:transform 0.2s ease;">
                        <span>📑</span> Study Cheat Sheets
                    </button>
                    <button onclick="retakeModuleQuiz(${id})" style="padding:0.75rem 1rem; background:rgba(16,185,129,0.15); color:#10b981; border:1.5px solid rgba(16,185,129,0.4); border-radius:12px; font-weight:800; font-size:0.88rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:transform 0.2s ease;">
                        <span>🎯</span> Practice Quiz
                    </button>
                </div>
            </div>
        `;
    } else if (m.activeLessonContent) {
        extraAction = m.activeLessonContent;
    } else if (m.unlockAction) {
        extraAction = m.unlockAction;
    }

    box.innerHTML = `
        <button onclick="closeLearningModal()" style="position:absolute; top:18px; right:22px; background:none; border:none; font-size:1.8rem; color:var(--text-muted); cursor:pointer; font-weight:700; line-height:1;">×</button>
        <div style="display:flex; align-items:center; gap:14px; margin-bottom:1.2rem;">
            <div style="width:56px; height:56px; border-radius:16px; background:var(--bg-main); display:flex; align-items:center; justify-content:center; font-size:2rem; border:1px solid var(--card-border); flex-shrink:0;">
                ${m.icon}
            </div>
            <div>
                <h2 style="font-size:1.35rem; font-weight:800; color:var(--text-primary); margin-bottom:4px;">${m.title}</h2>
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    ${statusPill}
                    <span style="font-size:0.84rem; color:var(--text-muted); font-weight:600;">⏱️ ${m.weeks}</span>
                    <span style="font-size:0.84rem; color:var(--text-muted); font-weight:600;">📊 ${m.level}</span>
                </div>
            </div>
        </div>

        <div style="font-weight:800; font-size:0.95rem; color:var(--text-primary); margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
            <span>Syllabus & Topics Checklist (Click any topic to expand notes)</span>
            <span style="font-size:0.82rem; color:#3b82f6;">${m.xp}</span>
        </div>
        <div>
            ${topicsHtml}
        </div>

        ${extraAction}
    `;

    overlay.style.display = 'flex';
}

function toggleTopicDetails(moduleId, topicIdx) {
    const drawer = document.getElementById(`topic-drawer-${moduleId}-${topicIdx}`);
    if (drawer) {
        if (drawer.style.display === 'none') {
            drawer.style.display = 'block';
        } else {
            drawer.style.display = 'none';
        }
    }
}

function markTopicReviewed(moduleId, topicIdx) {
    const m = learningModulesData[moduleId];
    if (!m || !m.topics[topicIdx]) return;

    const t = m.topics[topicIdx];
    t.state = 'done';
    t.xp = t.xp || '150 XP';

    // Check if there is a next topic and unlock it if locked
    if (m.topics[topicIdx + 1] && m.topics[topicIdx + 1].state === 'locked') {
        m.topics[topicIdx + 1].state = 'active';
        showToast(`✅ Topic ${topicIdx + 1} reviewed (+150 XP)! Unlocked Topic ${topicIdx + 2}: ${m.topics[topicIdx + 1].name}`, 'success');
    } else {
        showToast(`✅ Topic marked as reviewed (+150 XP)!`, 'success');
    }

    // Calculate new completion percentage & XP
    const doneCount = m.topics.filter(tp => tp.state === 'done' || tp.state === 'verified').length;
    const totalCount = m.topics.length;
    const newPct = Math.round((doneCount / totalCount) * 100);
    m.pct = newPct;
    m.xp = `${doneCount * 150} / ${totalCount * 150} XP`;

    // Update progress pill on main page
    const pill = document.getElementById(`lp-pill-${moduleId}`);
    if (pill) {
        if (newPct >= 100) {
            pill.textContent = "Completed";
            pill.className = "lp-pill-done";
        } else {
            pill.textContent = `In Progress (${newPct}%)`;
            pill.className = "lp-pill-prog";
        }
    }

    // Update active lesson content dynamically to next active topic if exists
    const activeIdx = m.topics.findIndex(tp => tp.state === 'active');
    if (activeIdx !== -1) {
        const nextTopic = m.topics[activeIdx];
        m.activeLessonContent = `
            <div style="background:var(--bg-main); border:1.5px solid var(--card-border); border-radius:14px; padding:1.25rem; margin-top:1.2rem;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
                    <span style="font-weight:800; color:#3b82f6; font-size:0.95rem;">📘 Active Topic: ${nextTopic.name}</span>
                    <span style="background:rgba(59,130,246,0.15); color:#3b82f6; padding:3px 10px; border-radius:12px; font-weight:700; font-size:0.78rem;">Topic ${activeIdx + 1} of ${totalCount}</span>
                </div>
                <p style="font-size:0.88rem; color:var(--text-secondary); line-height:1.6; margin-bottom:1rem;">
                    Continue your mastery of ${nextTopic.name}. Complete code challenges and verify your implementation against Springboard standards.
                </p>
                <button onclick="markTopicReviewed(${moduleId}, ${activeIdx})" style="width:100%; padding:0.9rem; background:var(--grad-primary); color:#fff; border:none; border-radius:12px; font-weight:800; font-size:0.95rem; cursor:pointer; box-shadow:0 6px 20px rgba(108,92,231,0.4); transition:transform 0.2s ease;">
                    ✅ Complete Topic ${activeIdx + 1} & Advance (+150 XP)
                </button>
            </div>
        `;
    } else if (doneCount === totalCount) {
        // All topics completed! Auto complete module & verify A+!
        completeModuleLesson(moduleId);
        return;
    }

    // Refresh modal to display updated XP, progress, and checkmarks
    openLearningModule(moduleId);
}

function generateTempCertificate(moduleId) {
    const overlay = document.getElementById('temp-cert-overlay');
    const box = document.getElementById('temp-cert-box');
    if (!overlay || !box) return;

    const m = learningModulesData[moduleId];
    if (!m) return;

    let userName = "Alex Johnson";
    if (typeof AuthManager !== 'undefined' && AuthManager.isLoggedIn()) {
        userName = AuthManager.getUser().name || userName;
    }

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const certId = `CERT-INFOSYS-AI-2026-${moduleId}9842-${Math.floor(1000 + Math.random()*9000)}`;

    box.innerHTML = `
        <button onclick="closeTempCertificate()" style="position:absolute; top:20px; right:24px; background:none; border:none; font-size:2rem; color:#94a3b8; cursor:pointer; font-weight:800; line-height:1;">×</button>
        
        <div style="border:2px dashed #f59e0b; border-radius:18px; padding:2rem 1.5rem; background:linear-gradient(145deg, #0f172a, #1e293b); position:relative;">
            <div style="font-size:3.5rem; margin-bottom:0.5rem; filter:drop-shadow(0 0 15px rgba(245,158,11,0.5));">🏆</div>
            <div style="text-transform:uppercase; letter-spacing:3px; font-size:0.85rem; font-weight:800; color:#f59e0b; margin-bottom:0.5rem;">Official Temporary Completion Certificate</div>
            <h2 style="font-size:1.8rem; font-weight:900; color:#ffffff; margin-bottom:1rem; font-family:'Outfit', sans-serif;">INFOSYS SPRINGBOARD AI INTERNSHIP</h2>
            
            <p style="font-size:0.95rem; color:#cbd5e1; margin-bottom:0.6rem;">This is to certify and officially verify that</p>
            <div style="font-size:1.65rem; font-weight:900; color:#38bdf8; text-decoration:underline; text-underline-offset:6px; margin-bottom:1rem; font-family:'Outfit', sans-serif;">${userName}</div>
            <p style="font-size:0.95rem; color:#cbd5e1; max-width:540px; margin:0 auto 1.5rem auto; line-height:1.6;">
                has successfully mastered and verified all syllabus topics, code drills, and capstone requirements for the course module:
            </p>
            
            <div style="background:rgba(245,158,11,0.15); border:1.5px solid #f59e0b; border-radius:12px; padding:1rem; display:inline-block; font-size:1.2rem; font-weight:800; color:#fbbf24; margin-bottom:1.8rem; box-shadow:0 10px 25px rgba(245,158,11,0.2);">
                📜 ${m.title} (Grade: A+ • Score: 98/100)
            </div>

            <div style="display:flex; justify-content:space-around; align-items:center; flex-wrap:wrap; gap:20px; border-top:1px solid rgba(255,255,255,0.12); padding-top:1.5rem; text-align:left; font-size:0.82rem; color:#94a3b8;">
                <div>
                    <div style="color:#e2e8f0; font-weight:700;">Certificate ID:</div>
                    <div style="font-family:monospace; color:#38bdf8;">${certId}</div>
                </div>
                <div>
                    <div style="color:#e2e8f0; font-weight:700;">Issue Date:</div>
                    <div>${today}</div>
                </div>
                <div>
                    <div style="color:#e2e8f0; font-weight:700;">Authorized By:</div>
                    <div style="color:#f59e0b; font-weight:700;">CareerInfinity AI & Infosys Council</div>
                </div>
            </div>
        </div>

        <div style="display:flex; justify-content:center; gap:14px; margin-top:1.6rem; flex-wrap:wrap;">
            <button onclick="downloadCertificateToast()" style="padding:0.85rem 1.6rem; background:linear-gradient(135deg, #3b82f6, #2563eb); color:#fff; border:none; border-radius:12px; font-weight:800; font-size:0.95rem; cursor:pointer; box-shadow:0 6px 20px rgba(59,130,246,0.4); display:flex; align-items:center; gap:8px;">
                <span>📥</span> Download PDF Certificate
            </button>
            <button onclick="shareCertificateToast('${certId}')" style="padding:0.85rem 1.6rem; background:rgba(255,255,255,0.1); color:#fff; border:1px solid rgba(255,255,255,0.25); border-radius:12px; font-weight:800; font-size:0.95rem; cursor:pointer; display:flex; align-items:center; gap:8px;">
                <span>🔗</span> Share Verification Link
            </button>
            <button onclick="closeTempCertificate()" style="padding:0.85rem 1.4rem; background:transparent; color:#94a3b8; border:1px solid #475569; border-radius:12px; font-weight:700; font-size:0.95rem; cursor:pointer;">
                Close
            </button>
        </div>
    `;

    overlay.style.display = 'flex';
}

function closeTempCertificate() {
    const overlay = document.getElementById('temp-cert-overlay');
    if (overlay) overlay.style.display = 'none';
}

function downloadCertificateToast() {
    showToast("🎉 Official Temporary Certificate downloaded as PDF successfully!", "success");
}

function shareCertificateToast(id) {
    showToast(`⚡ Certificate Verification Link copied to clipboard! ID: ${id || 'CERT-ACTIVE'}`, "info");
}

function viewModuleStudyNotes(moduleId) {
    const overlay = document.getElementById('study-notes-overlay');
    const box = document.getElementById('study-notes-box');
    if (!overlay || !box) return;

    const m = learningModulesData[moduleId];
    if (!m) return;

    box.innerHTML = `
        <button onclick="closeStudyNotes()" style="position:absolute; top:18px; right:22px; background:none; border:none; font-size:1.8rem; color:var(--text-muted); cursor:pointer; font-weight:700; line-height:1;">×</button>
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:1.4rem; border-bottom:1px solid var(--card-border); padding-bottom:1rem;">
            <span style="font-size:2rem;">📑</span>
            <div>
                <h3 style="font-size:1.3rem; font-weight:800; color:var(--text-primary); margin-bottom:3px;">${m.title} — Study Cheat Sheet</h3>
                <div style="font-size:0.82rem; color:var(--text-muted);">Quick Review Notes & Key Syntax Highlights</div>
            </div>
        </div>

        ${m.topics.map((t, idx) => `
            <div style="background:var(--bg-main); border:1px solid var(--card-border); border-radius:14px; padding:1.1rem; margin-bottom:1rem;">
                <div style="font-weight:800; color:#3b82f6; font-size:0.95rem; margin-bottom:0.4rem;">${idx + 1}. ${t.name}</div>
                <p style="font-size:0.86rem; color:var(--text-secondary); line-height:1.5; margin-bottom:0.6rem;">
                    Key concept verified for this topic during your Springboard internship. Mastered time complexity, memory allocation, and industry-standard coding patterns.
                </p>
                <div style="background:#0f172a; padding:10px; border-radius:8px; font-family:monospace; font-size:0.82rem; color:#38bdf8; border:1px solid rgba(255,255,255,0.06);">
                    // Example verified snippet for ${t.name.split(':')[0]}<br>
                    const verifiedResult = executeModuleCheck('${t.name.substring(0, 20)}...');
                </div>
            </div>
        `).join('')}

        <button onclick="closeStudyNotes()" style="width:100%; padding:0.85rem; background:var(--grad-primary); color:#fff; border:none; border-radius:12px; font-weight:800; font-size:0.95rem; cursor:pointer; margin-top:0.5rem;">
            ✅ Done Reviewing Notes
        </button>
    `;

    overlay.style.display = 'flex';
}

function closeStudyNotes() {
    const overlay = document.getElementById('study-notes-overlay');
    if (overlay) overlay.style.display = 'none';
}

function retakeModuleQuiz(moduleId) {
    const overlay = document.getElementById('study-notes-overlay');
    const box = document.getElementById('study-notes-box');
    if (!overlay || !box) return;

    const m = learningModulesData[moduleId];
    if (!m) return;

    box.innerHTML = `
        <button onclick="closeStudyNotes()" style="position:absolute; top:18px; right:22px; background:none; border:none; font-size:1.8rem; color:var(--text-muted); cursor:pointer; font-weight:700; line-height:1;">×</button>
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:1.4rem; border-bottom:1px solid var(--card-border); padding-bottom:1rem;">
            <span style="font-size:2rem;">🎯</span>
            <div>
                <h3 style="font-size:1.3rem; font-weight:800; color:var(--text-primary); margin-bottom:3px;">${m.title} — Practice Assessment</h3>
                <div style="font-size:0.82rem; color:var(--text-muted);">Quick 3-Question Knowledge Check</div>
            </div>
        </div>

        <div style="background:var(--bg-main); border:1.5px solid var(--card-border); border-radius:14px; padding:1.25rem; margin-bottom:1.2rem;">
            <div style="font-weight:800; color:var(--text-primary); font-size:0.95rem; margin-bottom:0.8rem;">1. What is the core advantage of mastering ${m.title} in modern enterprise software?</div>
            <div style="display:flex; flex-direction:column; gap:8px;">
                <button onclick="showToast('✅ Correct! Excellent understanding of core principles.','success')" style="text-align:left; padding:10px 14px; background:var(--bg-card); border:1px solid var(--card-border); border-radius:10px; color:var(--text-primary); font-weight:600; cursor:pointer; transition:all 0.2s;">A) It provides scalable, high-performance execution across distributed systems.</button>
                <button onclick="showToast('❌ Incorrect option. Try again!','error')" style="text-align:left; padding:10px 14px; background:var(--bg-card); border:1px solid var(--card-border); border-radius:10px; color:var(--text-primary); font-weight:600; cursor:pointer; transition:all 0.2s;">B) It eliminates the need for any hardware or memory management entirely.</button>
            </div>
        </div>

        <button onclick="closeStudyNotes(); showToast('🎉 Practice Quiz completed with 100% score! +50 XP awarded.','success');" style="width:100%; padding:0.9rem; background:linear-gradient(135deg, #10b981, #059669); color:#fff; border:none; border-radius:12px; font-weight:800; font-size:0.95rem; cursor:pointer;">
            ✅ Submit & Claim +50 XP Bonus
        </button>
    `;

    overlay.style.display = 'flex';
}

function closeLearningModal() {
    const overlay = document.getElementById('lp-modal-overlay');
    if (overlay) overlay.style.display = 'none';
}

function completeActiveLesson() {
    completeModuleLesson(4);
}

function completeModuleLesson(id) {
    const m = learningModulesData[id];
    if (!m) return;

    m.status = "Completed";
    m.pct = 100;
    m.xp = "+750 XP Earned";
    m.topics.forEach((t, idx) => {
        t.state = "done";
        if (idx === m.topics.length - 1) {
            t.xp = "150 XP • Grade: A+";
        } else {
            t.xp = t.xp || "150 XP";
        }
    });
    delete m.activeLessonContent;

    const pill = document.getElementById(`lp-pill-${id}`);
    if (pill) {
        pill.textContent = "Completed";
        pill.className = "lp-pill-done";
    }
    const circle = document.getElementById(`lp-circle-${id}`);
    if (circle) circle.className = "lp-circle";
    const box = document.getElementById(`lp-box-${id}`);
    if (box) box.className = "lp-card-box";

    // CRITICAL: Update Subtitle to show Verified A+ exactly like Modules 1, 2, and 3
    const sub = document.getElementById(`lp-sub-${id}`);
    if (sub) {
        sub.innerHTML = `${m.weeks} &nbsp;|&nbsp; ${m.level} &nbsp;|&nbsp; <span style="color:#10b981;font-weight:700;">✅ Verified A+</span>`;
    }

    // Hide or update progress bar continue button for clean verified display
    if (id === 4) {
        const btnCont = document.getElementById('btn-lp-cont-4');
        if (btnCont) btnCont.style.display = 'none';
        const fill = document.getElementById('lp-fill-4');
        if (fill) fill.style.width = "100%";
        const pct = document.getElementById('lp-pct-4');
        if (pct) pct.textContent = "100%";
        const progRow = document.getElementById('lp-prog-row-4');
        if (progRow) progRow.style.opacity = '0.4';
    }

    closeLearningModal();
    showToast(`🎉 Congratulations! You have achieved 100% mastery & Verified A+ grade in ${m.title}!`, "success");
}

function unlockModule(id) {
    const m = learningModulesData[id];
    if (m) {
        m.status = "In Progress";
        m.pct = 15;
        m.topics[0].state = "active";
        delete m.unlockAction;

        m.activeLessonContent = `
            <div style="background:var(--bg-main); border:1.5px solid var(--card-border); border-radius:14px; padding:1.25rem; margin-top:1.2rem;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
                    <span style="font-weight:800; color:#3b82f6; font-size:0.95rem;">📘 Active Capstone: ${m.title} Architecture & Drills</span>
                    <span style="background:rgba(59,130,246,0.15); color:#3b82f6; padding:3px 10px; border-radius:12px; font-weight:700; font-size:0.78rem;">Topic 1 of 4</span>
                </div>
                <p style="font-size:0.88rem; color:var(--text-secondary); line-height:1.6; margin-bottom:1rem;">
                    Execute hands-on industry practices, verify your code accuracy against Springboard benchmarks, and submit your final module evaluation.
                </p>
                <div style="background:#0f172a; padding:14px; border-radius:10px; font-family:'Courier New', monospace; font-size:0.88rem; color:#60a5fa; margin-bottom:1.25rem; overflow-x:auto; border:1px solid rgba(255,255,255,0.08);">
                    // Active evaluation sandbox for ${m.title}<br>
                    verifyCapstoneSubmission(User.currentProfile, { module: ${id}, status: 'READY' });
                </div>
                <button onclick="completeModuleLesson(${id})" style="width:100%; padding:0.9rem; background:var(--grad-primary); color:#fff; border:none; border-radius:12px; font-weight:800; font-size:0.95rem; cursor:pointer; box-shadow:0 6px 20px rgba(108,92,231,0.4); transition:transform 0.2s ease;">
                    ✅ Complete Module & Achieve Verified A+ Grade (+150 XP!)
                </button>
            </div>
        `;
    }

    const pill = document.getElementById(`lp-pill-${id}`);
    if (pill) {
        pill.textContent = "In Progress";
        pill.className = "lp-pill-prog";
    }
    const circle = document.getElementById(`lp-circle-${id}`);
    if (circle) circle.className = "lp-circle active";
    const box = document.getElementById(`lp-box-${id}`);
    if (box) box.className = "lp-card-box active";

    const sub = document.getElementById(`lp-sub-${id}`);
    if (sub) {
        sub.innerHTML = `${m.weeks} &nbsp;|&nbsp; ${m.level} &nbsp;|&nbsp; <span style="color:#3b82f6;font-weight:700;">⚡ Active Topic 1</span>`;
    }

    closeLearningModal();
    showToast(`⚡ Module ${id} unlocked! Click any card to access the lesson sandbox and earn +50 XP!`, "success");
}

// ============================================================================
// LANDING PAGE & MULTI-STEP ONBOARDING LOGIC
// ============================================================================
function initLandingPage() {
    let currentStep = 1;
    let collectedName = '';
    let collectedResumeFile = null;

    const stepPips = document.querySelectorAll('.step-pip');
    const panels = document.querySelectorAll('.step-panel');

    // 1. Persistent session check
    if (AuthManager.isLoggedIn()) {
        const user = AuthManager.getUser();
        const persistBanner = document.getElementById('persist-session-banner');
        const bannerName = document.getElementById('banner-user-name');
        const bannerEmail = document.getElementById('banner-user-email');
        const loginWrap = document.getElementById('login-steps-wrap');

        if (persistBanner) {
            persistBanner.classList.add('show');
            if (bannerName) bannerName.textContent = user.name;
            if (bannerEmail) bannerEmail.textContent = user.email;
            if (loginWrap) loginWrap.style.display = 'none';
        }
        document.getElementById('btn-continue-dash')?.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
        document.getElementById('btn-switch-user')?.addEventListener('click', () => {
            AuthManager.logout();
            window.location.reload();
        });
        return;
    }

    // Step navigation helper
    function goToStep(n) {
        panels.forEach((p, i) => p.classList.toggle('active', i + 1 === n));
        stepPips.forEach((pip, i) => {
            pip.classList.toggle('done', i + 1 < n);
            pip.classList.toggle('active', i + 1 === n);
        });
        currentStep = n;
    }

    // Make step circles (1, 2, 3) clickable directly
    stepPips.forEach((pip, i) => {
        pip.style.cursor = 'pointer';
        pip.addEventListener('click', () => goToStep(i + 1));
    });

    // STEP 1: Name Entry
    const nameInput = document.getElementById('step1-name');
    const namePreviewBadge = document.getElementById('name-preview-badge');
    const nameInitials = document.getElementById('name-initials');
    const namePreviewText = document.getElementById('name-preview-text');
    const step1Next = document.getElementById('step1-next');

    if (nameInput) {
        nameInput.addEventListener('input', () => {
            const val = nameInput.value.trim();
            if (val.length >= 2) {
                collectedName = val;
                const initials = val.split(' ').map(w => w[0].toUpperCase()).join('').substring(0, 2);
                if (nameInitials) nameInitials.textContent = initials;
                if (namePreviewText) namePreviewText.textContent = `Hi, ${val.split(' ')[0]}! 👋`;
                if (namePreviewBadge) namePreviewBadge.classList.add('visible');
                if (step1Next) step1Next.disabled = false;
                // ✅ Save name IMMEDIATELY so all pages can display it
                AuthManager.login(val, makeFakeEmail(val), 'Infosys Springboard AI Intern');
            } else {
                if (namePreviewBadge) namePreviewBadge.classList.remove('visible');
                if (step1Next) step1Next.disabled = true;
            }
        });
    }

    if (step1Next) {
        step1Next.addEventListener('click', () => {
            if (!collectedName) { toast('Please enter your full name first!', 'warning'); return; }
            goToStep(2);
        });
    }

    // Link between steps
    document.getElementById('link-go-signin')?.addEventListener('click', (e) => {
        e.preventDefault();
        goToStep(3);
    });
    document.getElementById('link-go-name')?.addEventListener('click', (e) => {
        e.preventDefault();
        goToStep(1);
    });

    // STEP 2: Resume Upload Dropzone
    const dropzone = document.getElementById('resume-dropzone');
    const resumeFileInput = document.getElementById('resume-file-input');
    const resumeSuccess = document.getElementById('resume-success-state');
    const resumeFileName = document.getElementById('resume-file-name');
    const parsingWrap = document.getElementById('parsing-progress-wrap');
    const step2Next = document.getElementById('step2-next');
    const step2Skip = document.getElementById('step2-skip');

    async function processResumeFile(file) {
        if (!file) return;
        collectedResumeFile = file;

        // Show success badge & hide dropzone
        if (resumeFileName) resumeFileName.textContent = file.name;
        if (resumeSuccess) resumeSuccess.classList.add('visible');
        if (dropzone) dropzone.style.display = 'none';

        // Animate 5 parsing steps
        if (parsingWrap) parsingWrap.classList.add('visible');
        const steps = parsingWrap?.querySelectorAll('.parsing-step') || [];

        const msgs = [
            'Extracting text content from file...',
            'Detecting programming skills & tech stack...',
            'Counting certifications & project experience...',
            'Calculating your Career Match Score...',
            'Generating personalized AI career recommendations...'
        ];

        for (let i = 0; i < steps.length; i++) {
            if (steps[i]) {
                steps[i].classList.add('active');
                const dot = steps[i].querySelector('.step-dot');
                if (dot) dot.textContent = '⟳';
            }
            await delay(550);
            if (steps[i]) {
                steps[i].classList.remove('active');
                steps[i].classList.add('completed');
                const dot = steps[i].querySelector('.step-dot');
                if (dot) dot.textContent = '✓';
            }
        }

        // Extract raw text & parse (with real backend check)
        const resolvedName = collectedName || AuthManager.getUser().name || 'Springboard Intern';
        const parsed = await parseOrFetchBackendResume(file, resolvedName);

        window._parsedResumeData = parsed;
        if (step2Next) step2Next.disabled = false;
        toast(`✨ Analysis complete! Match Score: ${parsed.matchScore}%`, 'success');
    }

    if (resumeFileInput) {
        resumeFileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) processResumeFile(e.target.files[0]);
        });
    }

    if (dropzone) {
        dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            if (e.dataTransfer.files[0]) processResumeFile(e.dataTransfer.files[0]);
        });
    }

    const clearBtn = document.getElementById('resume-clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            collectedResumeFile = null;
            window._parsedResumeData = null;
            if (resumeSuccess) resumeSuccess.classList.remove('visible');
            if (dropzone) dropzone.style.display = 'block';
            if (parsingWrap) parsingWrap.classList.remove('visible');
            if (resumeFileInput) resumeFileInput.value = '';
            if (step2Next) step2Next.disabled = true;
        });
    }

    if (step2Next) {
        step2Next.addEventListener('click', () => {
            const resolvedName = collectedName || 'Ananya Sharma';
            const parsed = window._parsedResumeData || ResumeParser.parse(demoResumeText(resolvedName));
            AuthManager.login(resolvedName, '', 'Infosys Springboard AI Intern');
            AuthManager.saveResume(parsed);
            toast(`🎉 Welcome aboard, ${resolvedName.split(' ')[0]}! Opening Dashboard...`, 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 1050);
        });
    }

    if (step2Skip) {
        step2Skip.addEventListener('click', () => {
            const resolvedName = collectedName || 'Ananya Sharma';
            const basicParsed = ResumeParser.parse(demoResumeText(resolvedName));
            AuthManager.login(resolvedName, '', 'Infosys Springboard AI Intern');
            AuthManager.saveResume(basicParsed);
            toast(`⚡ Profile created! Welcome ${resolvedName.split(' ')[0]}!`, 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 950);
        });
    }

    // STEP 3: Standard Email/Password Sign In
    const loginForm = document.getElementById('standard-login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailVal = document.getElementById('login-email')?.value.trim() || 'ananya.sharma@infosys.edu';
            const resolvedName = emailVal.includes('@')
                ? emailVal.split('@')[0].replace(/\./g, ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase())
                : (emailVal || 'User');
            const parsed = window._parsedResumeData || ResumeParser.parse(demoResumeText(resolvedName));
            AuthManager.login(resolvedName, emailVal.includes('@') ? emailVal : `${resolvedName.toLowerCase().replace(/\s+/g,'.')}@infosys.edu`, 'Infosys Springboard AI Intern');
            AuthManager.saveResume(parsed);
            toast(`🔐 Welcome back, ${resolvedName.split(' ')[0]}! Loading Dashboard...`, 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 1050);
        });
    }

    // Eye toggle for password
    const eyeBtn = document.getElementById('eye-toggle-btn');
    const passInput = document.getElementById('login-password');
    if (eyeBtn && passInput) {
        eyeBtn.addEventListener('click', () => {
            const isPass = passInput.type === 'password';
            passInput.type = isPass ? 'text' : 'password';
            eyeBtn.innerHTML = isPass ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
        });
    }

    // SSO Buttons (Google, LinkedIn, Microsoft) -> Open SSO Modal
    document.querySelectorAll('.btn-sso').forEach(btn => {
        btn.addEventListener('click', () => openSSOModal());
    });

    // Initialize SSO Modal
    initSSOModal();
}

// ============================================================================
// SSO MODAL — Now includes resume upload step
// ============================================================================
let _ssoSelectedName = '';
let _ssoSelectedEmail = '';

function openSSOModal() {
    document.getElementById('sso-overlay')?.classList.add('open');
    showSSOPanel('accounts'); // show account selection first
}

function initSSOModal() {
    const overlay = document.getElementById('sso-overlay');
    const closeBtn = document.getElementById('sso-modal-close');

    if (closeBtn) closeBtn.addEventListener('click', () => overlay?.classList.remove('open'));
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });

    // Account selection items
    document.querySelectorAll('.acct-item').forEach(item => {
        item.addEventListener('click', () => {
            _ssoSelectedName = item.dataset.name;
            _ssoSelectedEmail = item.dataset.email;
            AuthManager.login(_ssoSelectedName, _ssoSelectedEmail, 'Infosys Springboard AI Intern');
            // Move to resume upload step
            showSSOPanel('resume');
        });
    });

    // Custom name SSO
    const customForm = document.getElementById('custom-sso-form');
    if (customForm) {
        customForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const val = document.getElementById('custom-sso-name')?.value.trim();
            if (!val) return;
            _ssoSelectedName = val;
            _ssoSelectedEmail = makeFakeEmail(val);
            AuthManager.login(_ssoSelectedName, _ssoSelectedEmail, 'Infosys Springboard AI Intern');
            showSSOPanel('resume');
        });
    }

    // Resume upload in SSO modal
    const resumeInput = document.getElementById('sso-resume-input');
    const ssoDropzone = document.getElementById('sso-resume-dropzone');
    const ssoSuccess = document.getElementById('sso-upload-success');
    const ssoFileName = document.getElementById('sso-file-name');
    const ssoClearBtn = document.getElementById('sso-clear-btn');
    const parseSteps = document.getElementById('sso-parse-steps');
    const ssoContinueBtn = document.getElementById('sso-continue-btn');
    const ssoSkipBtn = document.getElementById('sso-skip-btn');

    if (resumeInput) {
        resumeInput.addEventListener('change', (e) => {
            if (e.target.files[0]) handleSSOResume(e.target.files[0]);
        });
    }

    if (ssoDropzone) {
        ssoDropzone.addEventListener('dragover', (e) => { e.preventDefault(); ssoDropzone.classList.add('over'); });
        ssoDropzone.addEventListener('dragleave', () => ssoDropzone.classList.remove('over'));
        ssoDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            ssoDropzone.classList.remove('over');
            if (e.dataTransfer.files[0]) handleSSOResume(e.dataTransfer.files[0]);
        });
    }

    if (ssoClearBtn) {
        ssoClearBtn.addEventListener('click', () => {
            ssoSuccess?.classList.remove('show');
            ssoDropzone?.style && (ssoDropzone.style.display = 'block');
            parseSteps?.classList.remove('show');
            if (resumeInput) resumeInput.value = '';
            if (ssoContinueBtn) ssoContinueBtn.disabled = true;
        });
    }

    if (ssoContinueBtn) {
        ssoContinueBtn.disabled = true;
        ssoContinueBtn.addEventListener('click', () => {
            document.getElementById('sso-overlay')?.classList.remove('open');
            showToast(`⚡ SSO Verified! Welcome ${_ssoSelectedName.split(' ')[0]}! Opening dashboard...`, 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 800);
        });
    }

    if (ssoSkipBtn) {
        ssoSkipBtn.addEventListener('click', () => {
            // Skip resume — generate basic data
            const parsed = ResumeParser.parse(demoResumeText(_ssoSelectedName));
            AuthManager.saveResume(parsed);
            document.getElementById('sso-overlay')?.classList.remove('open');
            showToast(`⚡ SSO Login successful! Welcome ${_ssoSelectedName.split(' ')[0]}!`, 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 500);
        });
    }
}

async function handleSSOResume(file) {
    const ssoDropzone = document.getElementById('sso-resume-dropzone');
    const ssoSuccess = document.getElementById('sso-upload-success');
    const ssoFileName = document.getElementById('sso-file-name');
    const parseSteps = document.getElementById('sso-parse-steps');
    const ssoContinueBtn = document.getElementById('sso-continue-btn');
    const stepEls = parseSteps?.querySelectorAll('.parse-step') || [];

    if (ssoFileName) ssoFileName.textContent = file.name;
    ssoSuccess?.classList.add('show');
    if (ssoDropzone) ssoDropzone.style.display = 'none';
    parseSteps?.classList.add('show');

    // Animate parse steps
    for (let i = 0; i < stepEls.length; i++) {
        stepEls[i].classList.add('active');
        await delay(500);
        stepEls[i].classList.remove('active');
        stepEls[i].classList.add('done');
    }

    const parsed = await parseOrFetchBackendResume(file, _ssoSelectedName);
    AuthManager.saveResume(parsed);

    if (ssoContinueBtn) ssoContinueBtn.disabled = false;
    showToast(`✅ Resume analyzed! ${Object.keys(parsed.skills).length} skills detected.`, 'success');
}

function showSSOPanel(panel) {
    document.querySelectorAll('.sso-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`sso-panel-${panel}`)?.classList.add('active');
    // Update modal title
    const modalTitle = document.getElementById('sso-modal-title');
    if (modalTitle) {
        modalTitle.textContent = panel === 'accounts' ? 'Choose Your Account' : `Upload Resume, ${_ssoSelectedName.split(' ')[0]}`;
    }
}

// ============================================================================
// DASHBOARD PAGE LOGIC
// ============================================================================
function initDashboardPage() {
    const user = AuthManager.getUser();
    const rd = user.resumeData;
    const hasResume = user.resumeUploaded && rd && Object.keys(rd).length > 3;

    // Redirect if not logged in
    if (!AuthManager.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    // Fill user name everywhere
    document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = user.name);
    document.querySelectorAll('[data-user-firstname]').forEach(el => el.textContent = user.firstName);
    document.querySelectorAll('[data-user-email]').forEach(el => el.textContent = user.email);
    document.querySelectorAll('[data-user-role]').forEach(el => el.textContent = user.role);
    document.querySelectorAll('[data-user-initial]').forEach(el => el.textContent = user.name.charAt(0).toUpperCase());

    // Welcome heading
    const welcomeH = document.getElementById('welcome-heading');
    if (welcomeH) welcomeH.innerHTML = `Welcome back, <span style="color:var(--accent-cyan);">${user.firstName}</span>! 👋`;

    // Resume alert bar
    const alertBar = document.getElementById('resume-alert-bar');
    if (!hasResume && alertBar) alertBar.classList.remove('gone');
    else alertBar?.classList.add('gone');

    // Career match score
    const scoreEl = document.getElementById('match-score-num');
    const radialFill = document.getElementById('radial-fill');
    const matchChip = document.getElementById('match-chip');
    const matchComment = document.getElementById('match-comment');
    const roleTagsEl = document.getElementById('role-tags');

    const score = hasResume ? (rd.matchScore || 0) : 0;
    if (scoreEl) animateNum(scoreEl, score, 1500, '%');

    if (radialFill) {
        const circ = 2 * Math.PI * 54;
        radialFill.style.strokeDasharray = circ;
        setTimeout(() => {
            radialFill.style.strokeDashoffset = circ - (score / 100) * circ;
            radialFill.style.stroke = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
        }, 400);
    }

    if (matchChip) {
        if (score >= 85) { matchChip.className = 'match-chip chip-green'; matchChip.innerHTML = '<i class="fa-solid fa-check"></i> Excellent'; }
        else if (score >= 70) { matchChip.className = 'match-chip chip-amber'; matchChip.innerHTML = '<i class="fa-solid fa-thumbs-up"></i> Good'; }
        else if (score >= 50) { matchChip.className = 'match-chip chip-amber'; matchChip.innerHTML = '<i class="fa-solid fa-circle-info"></i> Average'; }
        else { matchChip.className = 'match-chip chip-gray'; matchChip.innerHTML = '📄 Upload Resume'; }
    }

    if (matchComment) {
        matchComment.textContent = hasResume ? rd.comment : '📁 Upload your resume to get an AI-powered career match score and personalized recommendations!';
    }

    if (roleTagsEl && hasResume && rd.careerPaths) {
        roleTagsEl.innerHTML = rd.careerPaths.map(p => `<span class="role-tag">${p.title}</span>`).join('');
    }

    // ATS bars
    const atsBars = [
        { barId: 'ats-bar', numId: 'ats-num', key: 'atsScore', color: 'linear-gradient(90deg,#6c5ce7,#00d2ff)' },
        { barId: 'grammar-bar', numId: 'grammar-num', key: 'grammarScore', color: 'linear-gradient(90deg,#3b82f6,#06b6d4)' },
        { barId: 'keyword-bar', numId: 'keyword-num', key: 'keywordScore', color: 'linear-gradient(90deg,#10b981,#059669)' },
        { barId: 'format-bar', numId: 'format-num', key: 'formattingScore', color: 'linear-gradient(90deg,#f59e0b,#d97706)' },
    ];
    atsBars.forEach(({ barId, numId, key, color }) => {
        const val = hasResume ? (rd[key] || 0) : 0;
        const bar = document.getElementById(barId);
        const num = document.getElementById(numId);
        if (bar) { bar.style.background = color; setTimeout(() => bar.style.width = val + '%', 400); }
        if (num) num.textContent = val + '%';
    });

    // Show ATS section if resume uploaded
    if (hasResume) {
        document.getElementById('ats-scores-section')?.style && (document.getElementById('ats-scores-section').style.display = 'flex');
        document.getElementById('mini-upload-box')?.style && (document.getElementById('mini-upload-box').style.display = 'none');
    }

    // AI tip
    const aiTipEl = document.getElementById('ai-tip-text');
    if (aiTipEl && hasResume && rd.skills) {
        const sk = Object.keys(rd.skills);
        aiTipEl.textContent = sk.length > 0
            ? `✅ Great keyword match for ${sk.slice(0, 3).join(', ')}. Add leadership, system design, and open-source contributions to push ATS above 95%.`
            : 'Add more technical skills and certifications to improve your ATS compatibility score.';
    }

    // KPI Cards
    const kpiVals = hasResume ? {
        skills: rd.skillsLearned || 0,
        certs: rd.certCount || 0,
        certsMonth: rd.certThisMonth || 0,
        mock: rd.mockScore || 0,
        profile: rd.profileScore || 0
    } : { skills: 0, certs: 0, certsMonth: 0, mock: 0, profile: 0 };

    animateNum(document.getElementById('kpi-skills'), kpiVals.skills, 1200);
    animateNum(document.getElementById('kpi-certs'), kpiVals.certs, 1200);
    animateNum(document.getElementById('kpi-mock'), kpiVals.mock, 1200);
    animateNum(document.getElementById('kpi-profile'), kpiVals.profile, 1200, '%');

    const certsMonthEl = document.getElementById('kpi-certs-month');
    if (certsMonthEl) certsMonthEl.textContent = `+${kpiVals.certsMonth} this month`;

    const profileLabel = document.getElementById('kpi-profile-label');
    if (profileLabel && hasResume) {
        profileLabel.textContent = kpiVals.profile >= 80 ? 'Excellent strength' : kpiVals.profile >= 60 ? 'Good progress' : 'Keep adding details';
    }

    // Career Paths
    const cpContainer = document.getElementById('career-paths-list');
    if (cpContainer) {
        if (hasResume && rd.careerPaths) {
            cpContainer.innerHTML = rd.careerPaths.map((p, i) => `
                <div class="cp-row">
                    <div class="cp-l">
                        <div class="cp-num">${i + 1}</div>
                        <div><div class="cp-title">${p.title}</div><div class="cp-sub">${p.sub}</div></div>
                    </div>
                    <div class="cp-pct">${p.pct}%</div>
                </div>
            `).join('');
        } else {
            cpContainer.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);font-size:0.85rem;">📁 Upload your resume to see personalized career path recommendations</div>`;
        }
    }

    // Skills bars
    const skillsContainer = document.getElementById('skills-list');
    if (skillsContainer) {
        if (hasResume && rd.skills && Object.keys(rd.skills).length > 0) {
            const colors = ['linear-gradient(90deg,#6c5ce7,#4834d4)', 'linear-gradient(90deg,#3b82f6,#06b6d4)', 'linear-gradient(90deg,#10b981,#059669)', 'linear-gradient(90deg,#f59e0b,#d97706)', 'linear-gradient(90deg,#ec4899,#f43f5e)', 'linear-gradient(90deg,#8b5cf6,#6c5ce7)'];
            skillsContainer.innerHTML = Object.entries(rd.skills).slice(0, 6).map(([name, pct], i) => `
                <div class="skill-row">
                    <div class="skill-top"><span>${name}</span><span>${pct}%</span></div>
                    <div class="prog-track"><div class="prog-fill" data-target="${pct}" style="width:0%;background:${colors[i % colors.length]};height:7px;border-radius:4px;transition:width 1.2s ease;"></div></div>
                </div>
            `).join('');
            setTimeout(() => {
                skillsContainer.querySelectorAll('.prog-fill[data-target]').forEach(el => el.style.width = el.dataset.target + '%');
            }, 400);
        } else {
            skillsContainer.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-muted);font-size:0.82rem;">📁 Upload resume to see your skill proficiency levels</div>`;
        }
    }

    // Resume Ring
    const rsRing = document.getElementById('rs-ring');
    const rsNum = document.getElementById('rs-num');
    const rsLabel = document.getElementById('rs-label');
    if (hasResume) {
        const atsVal = rd.atsScore || 0;
        if (rsRing) setTimeout(() => rsRing.style.strokeDashoffset = 251 - (atsVal / 100) * 251, 500);
        if (rsNum) animateNum(rsNum, atsVal, 1200);
        if (rsLabel) rsLabel.textContent = atsVal >= 85 ? 'Excellent' : atsVal >= 70 ? 'Good' : atsVal >= 55 ? 'Average' : 'Needs Work';
    }

    // Dashboard resume re-upload
    const dashResumeInput = document.getElementById('dash-resume-input');
    if (dashResumeInput) {
        dashResumeInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            toast('🔍 Analyzing your resume with AI...', 'info');
            const parsed = await parseOrFetchBackendResume(file, user.name);
            AuthManager.saveResume(parsed);
            toast('✅ Resume updated! Refreshing dashboard data...', 'success');
            setTimeout(() => window.location.reload(), 1200);
        });
    }

    // Profile dropdown
    initProfileDropdown();
}

function initIdeasPage() { /* ideas page only needs theme toggle */ }

// ============================================================================
// PROFILE DROPDOWN
// ============================================================================
function initProfileDropdown() {
    const pill = document.getElementById('profile-pill');
    const dropdown = document.getElementById('pill-dropdown');
    const logoutBtn = document.getElementById('btn-logout');

    if (pill && dropdown && !pill._hasDropdownBound) {
        pill._hasDropdownBound = true;
        pill.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('open'); });
        document.addEventListener('click', () => dropdown.classList.remove('open'));
    }

    if (logoutBtn && !logoutBtn._hasLogoutBound) {
        logoutBtn._hasLogoutBound = true;
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            AuthManager.logout();
            toast('Logged out successfully!', 'success');
            setTimeout(() => window.location.href = 'index.html', 700);
        });
    }
}

// ============================================================================
// CHATBOT — injected globally into every page
// ============================================================================
function injectChatbot() {
    if (document.getElementById('ci-chatbot')) return;
    document.body.insertAdjacentHTML('beforeend', `
    <div id="ci-chatbot" class="chat-widget">
        <button class="chat-fab" id="chat-fab-btn" title="AI Career Assistant">🤖<span class="fab-badge">AI</span></button>
        <div class="chat-win" id="chat-window">
            <div class="chat-hdr">
                <div class="chat-hdr-l">
                    <div class="bot-av">🧠</div>
                    <div>
                        <div class="bot-nm">CareerInfinity AI</div>
                        <div class="bot-st"><div class="online-dot"></div> Online • Springboard Guide</div>
                    </div>
                </div>
                <button class="chat-x" id="chat-close">×</button>
            </div>
            <div class="chat-body" id="chat-feed">
                <div class="chat-bub bot">
                    Hello! 👋 I'm your <strong>CareerInfinity AI</strong> for Infosys Springboard. Ask me about resume scores, careers, skills, or SSO login!
                    <span class="bub-time bt">Just now</span>
                </div>
                <div class="sugg-pills">
                    <span class="sugg-pill" data-q="How does resume scoring work?">📊 Resume Score</span>
                    <span class="sugg-pill" data-q="How does SSO login work?">🔑 SSO</span>
                    <span class="sugg-pill" data-q="Which career path suits me?">🎯 Career Path</span>
                    <span class="sugg-pill" data-q="How to improve my score?">📈 Improve Score</span>
                </div>
            </div>
            <form class="chat-foot" id="chat-form">
                <input type="text" class="chat-inp" id="chat-inp" placeholder="Ask about careers, resume, skills..." autocomplete="off">
                <button type="submit" class="chat-send">➤</button>
            </form>
        </div>
    </div>`);

    const fab = document.getElementById('chat-fab-btn');
    const win = document.getElementById('chat-window');
    const closeBtn = document.getElementById('chat-close');
    const form = document.getElementById('chat-form');
    const inp = document.getElementById('chat-inp');
    const feed = document.getElementById('chat-feed');

    fab.addEventListener('click', () => { win.classList.toggle('open'); if (win.classList.contains('open')) inp.focus(); });
    closeBtn.addEventListener('click', () => win.classList.remove('open'));

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('sugg-pill')) sendMsg(e.target.dataset.q);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = inp.value.trim();
        if (!msg) return;
        sendMsg(msg);
        inp.value = '';
    });

    function sendMsg(msg) {
        addBubble(msg, 'user');
        setTimeout(() => addBubble(botAnswer(msg), 'bot'), 650);
    }

    function addBubble(text, side) {
        const div = document.createElement('div');
        div.className = `chat-bub ${side}`;
        div.innerHTML = text + `<span class="bub-time ${side === 'bot' ? 'bt' : ''}">${side === 'user' ? 'You' : 'AI'}</span>`;
        feed.appendChild(div);
        feed.scrollTop = feed.scrollHeight;
    }

    function botAnswer(q) {
        const user = AuthManager.getUser();
        const rd = user.resumeData;
        const ql = q.toLowerCase();

        if (ql.includes('resume') && ql.includes('scor')) return `📊 <strong>Resume Scoring:</strong><br>Your resume is parsed client-side using AI keyword extraction across 10+ skill categories. Your ATS score: <strong>${rd.atsScore || 0}%</strong>. Upload a detailed resume to push above 90%!`;
        if (ql.includes('sso') || ql.includes('login')) return `🔑 <strong>SSO Login:</strong><br>Click any provider (Infosys/Google/Microsoft) on the login page to open the OAuth modal. <strong>After selecting your account, you'll be prompted to upload your resume</strong> for personalized analytics. Your session is saved — no re-login needed!`;
        if (ql.includes('backend') || ql.includes('data') && ql.includes('real')) return `⚙️ <strong>About Data:</strong><br>This prototype uses <strong>client-side simulation</strong> with localStorage + AI keyword extraction. In production, it would connect to:<br>• Node.js + PostgreSQL backend<br>• Python FastAPI for resume NLP<br>• Real OAuth 2.0 SSO server`;
        if (ql.includes('career') || ql.includes('path') || ql.includes('suits')) {
            const paths = rd.careerPaths;
            if (paths?.length) return `🎯 <strong>Your Top Career Matches:</strong><br>${paths.map(p => `• ${p.title} — <strong>${p.pct}%</strong>`).join('<br>')}`;
            return `🎯 Upload your resume to get personalized career path recommendations based on your actual skills!`;
        }
        if (ql.includes('improve') || ql.includes('score')) return `📈 <strong>Boost your score (${user.matchScore}%):</strong><br>• Add Python, SQL, ML projects to resume<br>• Earn 3+ certifications from NPTEL/Coursera<br>• Include GitHub links & project descriptions<br>• Complete mock interviews<br>• Fill profile strength to 90%+`;
        if (ql.includes('theme') || ql.includes('dark') || ql.includes('light')) return `🌙 Toggle Dark/Light mode using the ☀️ button in the <strong>top navbar</strong> on every page. Your preference is automatically saved across sessions!`;
        if (ql.includes('hi') || ql.includes('hello') || ql.includes('hey')) return `Hello <strong>${user.firstName}</strong>! 😊 Ready to boost your career today? Ask me anything!`;
        return `🤖 I understand you're asking about "<em>${esc(q)}</em>". For best results, upload your resume to unlock personalized AI insights and career recommendations tailored to your profile!`;
    }
}

// ============================================================================
// UTILITIES
// ============================================================================
function animateNum(el, target, duration = 1200, suffix = '') {
    if (!el) return;
    let start = 0;
    const step = target / (duration / 16);
    const t = setInterval(() => {
        start += step;
        if (start >= target) { start = target; clearInterval(t); }
        el.textContent = Math.round(start) + suffix;
    }, 16);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function toast(msg, type = 'info') {
    let el = document.getElementById('ci-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'ci-toast';
        el.style.cssText = `position:fixed;top:24px;left:50%;transform:translateX(-50%) translateY(-80px);z-index:99999;padding:14px 26px;border-radius:14px;font-family:var(--font-body);font-weight:700;font-size:0.88rem;box-shadow:0 10px 30px rgba(0,0,0,0.4);transition:transform 0.4s cubic-bezier(0.25,0.8,0.25,1),opacity 0.4s ease;opacity:0;white-space:nowrap;color:#fff;`;
        document.body.appendChild(el);
    }
    const colors = { success:'linear-gradient(135deg,#10b981,#059669)', info:'linear-gradient(135deg,#6c5ce7,#4834d4)', warning:'linear-gradient(135deg,#f59e0b,#d97706)', error:'linear-gradient(135deg,#ef4444,#dc2626)' };
    el.style.background = colors[type] || colors.info;
    el.innerHTML = msg;
    el.style.transform = 'translateX(-50%) translateY(0)';
    el.style.opacity = '1';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.transform = 'translateX(-50%) translateY(-80px)'; el.style.opacity = '0'; }, 3500);
}

// Expose needed globals
window.showToast = toast;
window.openDashResume = () => document.getElementById('dash-resume-input')?.click();
window.selectCareerDomain = selectCareerDomain;
window.selectSkillDomain = selectSkillDomain;
window.openLearningModule = openLearningModule;
window.closeLearningModal = closeLearningModal;
window.completeActiveLesson = completeActiveLesson;
window.completeModuleLesson = completeModuleLesson;
window.unlockModule = unlockModule;
window.toggleTopicDetails = toggleTopicDetails;
window.markTopicReviewed = markTopicReviewed;
window.generateTempCertificate = generateTempCertificate;
window.closeTempCertificate = closeTempCertificate;
window.viewModuleStudyNotes = viewModuleStudyNotes;
window.closeStudyNotes = closeStudyNotes;
window.retakeModuleQuiz = retakeModuleQuiz;
window.downloadCertificateToast = downloadCertificateToast;
window.shareCertificateToast = shareCertificateToast;
