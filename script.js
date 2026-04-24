/**
 * ============================================================
 * SMARTRENT AI | DECISION INTELLIGENCE ENGINE
 * VERSION: 13.0.0 (ULTIMATE FULL RELEASE)
 * DEVELOPER: Z.AI CORE
 * FEATURES: 3-Mode Transport, COL Logic, Overlay-Integrated Chat
 * ============================================================
 */

// ---------- GLOBAL STATE MANAGEMENT ----------
let adCounter = 1;
let currentRankedAds = []; 
let userProfile = {
    salary: 0,
    commitments: 0,
    depositBudget: 0,
    workplace: "",
    transportMode: "Car"
};

// ENDPOINT FOR GOOGLE APPS SCRIPT PROXY
const GOOGLE_PROXY_URL = "https://script.google.com/macros/s/AKfycbyTlrixa43Psv9xyybmKi7qkF4dyJRavltMmMkzfXwSF3hQqAoGhW-WQuPvzynUDRDVEQ/exec";

/**
 * 1. UI COMPONENT: DYNAMIC RENTAL AD INPUT
 * Adds a new input field for users to paste ad details.
 * Restricted to 5 ads to maintain AI processing precision.
 */
window.addRentalAd = function () {
    console.log("System: Requesting new ad input field...");
    
    if (adCounter >= 5) {
        alert("Attention: Z.AI limits analysis to 5 properties for maximum decision accuracy.");
        return;
    }

    adCounter++;
    const container = document.getElementById("ads-dynamic-list");
    const newAdDiv = document.createElement("div");
    
    // UI Construction with Tailwind Classes
    newAdDiv.className = "ad-entry flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 mb-2 shadow-sm animate-fadeIn transition-all duration-300";
    newAdDiv.innerHTML = `
        <div class="flex items-center justify-center bg-slate-100 w-8 h-8 rounded-full">
            <span class="text-[11px] font-black text-slate-500">#0${adCounter}</span>
        </div>
        <input class="ad-input flex-1 border-none bg-transparent outline-none text-sm font-bold text-slate-700 placeholder-slate-300" 
               type="text" 
               placeholder="Paste property link or description here...">
        <button onclick="removeAdField(this)" 
                class="text-red-400 hover:text-red-600 font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors">
            ✕
        </button>
    `;
    
    container.appendChild(newAdDiv);
};

/**
 * Helper to remove ad fields and decrement counter.
 */
window.removeAdField = function (btn) {
    btn.parentElement.remove();
    adCounter--;
    console.log("System: Ad field removed. Current count: " + adCounter);
};

/**
 * 2. ANALYTICS ENGINE: COST OF LIVING (COL) & SUSTAINABILITY
 * This is the 'Brain' of Z.AI. It calculates the financial impact of each ad.
 */
function evaluateRentalOption(propertyRaw, profile, isChatUpdate = false) {
    const rent = parseFloat(propertyRaw.monthly_rent) || 0;
    const distance = parseFloat(propertyRaw.estimated_distance_km) || 0;
    
    console.log(`Analyzing: ${propertyRaw.area_name} | Rent: RM${rent} | Dist: ${distance}km`);

    // TRANSPORTATION COST CALCULATION (3-MODES LOGIC)
    let transportCost = 0;
    if (profile.transportMode === "Car") {
        // Formula: (Distance * Cost/KM * 2 trips * 22 days) + Parking/Tolls
        transportCost = Math.round(distance * 0.65 * 2 * 22 + 70); 
    } else if (profile.transportMode === "Public Transport") {
        // Formula: (Distance * Rate + Base) capped at My50/Monthly pass logic
        transportCost = Math.round(Math.min(11, distance * 0.45 + 2) * 22);
    } else if (profile.transportMode === "Walk") {
        // Minimal maintenance cost (shoes, umbrella, convenience)
        transportCost = 20; 
    }

    // TOTAL MONTHLY COST OF LIVING (COL)
    // Formula: Monthly Rent + Monthly Transport + User Fixed Commitments
    const totalMonthlyCost = rent + transportCost + profile.commitments;
    
    // NET DISPOSABLE INCOME (BUFFER)
    const netBalance = profile.salary - totalMonthlyCost;
    
    // UPFRONT CAPITAL (NORMAL DEPOSIT 1+1)
    const depositRequired = rent * 2; 

    // Z-AI DECISION INTELLIGENCE LOGIC
    let aiStatus = "PASSED";
    let aiComment = "";

    if (netBalance < 500) {
        aiStatus = "RISK";
        aiComment = "Z.AI: Risk detected! The total Cost of Living (COL) exceeds your safety buffer.";
    } else if (depositRequired > profile.depositBudget) {
        aiStatus = "CAUTION";
        aiComment = `Z.AI: Capital Barrier! You are RM ${depositRequired - profile.depositBudget} short for the 1+1 deposit.`;
    } else if (rent > (profile.salary * 0.35)) {
        aiStatus = "CAUTION";
        aiComment = "Z.AI: Rent exceeds 35% of income. Sustainable but limits savings potential.";
    } else {
        aiStatus = "PASSED";
        aiComment = isChatUpdate ? "Z.AI: Values re-calculated. Negotiation success!" : "Z.AI: Optimal match. Strong financial buffer for your lifestyle.";
    }

    return {
        ...propertyRaw,
        monthly_rent: rent,
        estimated_distance_km: distance,
        transportCost: transportCost,
        totalLivingCost: totalMonthlyCost,
        disposableIncome: Math.max(0, netBalance),
        depositRequired: depositRequired,
        status: aiStatus,
        zAiAnalysis: aiComment,
        adIndex: propertyRaw.adIndex
    };
}

/**
 * 3. MAIN SERVICE: RUN ANALYSIS
 * Fetches data from Google Proxy and triggers the ranking system.
 */
window.runSmartAnalysis = async function () {
    // CAPTURE ALL USER INPUT DATA
    userProfile = {
        salary: parseFloat(document.getElementById("salary").value) || 0,
        commitments: parseFloat(document.getElementById("commitments").value) || 0,
        depositBudget: parseFloat(document.getElementById("deposit_budget").value) || 0,
        workplace: document.getElementById("workplace").value.trim().toUpperCase() || "TRX",
        transportMode: document.getElementById("transport_mode").value
    };

    // COLLECT ALL AD INPUTS
    const adInputs = Array.from(document.querySelectorAll(".ad-input"))
        .map(inp => inp.value.trim())
        .filter(v => v !== "");

    // INPUT VALIDATION
    if (!userProfile.salary || userProfile.salary <= 0) {
        alert("Validation Error: Please enter a valid monthly salary.");
        return;
    }
    if (adInputs.length === 0) {
        alert("Validation Error: Please add at least one rental advertisement.");
        return;
    }

    // SHOW LOADING OVERLAY
    const loader = document.getElementById("loadingOverlay");
    loader.style.display = "flex";

    try {
        console.log("System: Fetching AI Intelligence from Google Proxy...");
        
        const response = await fetch(GOOGLE_PROXY_URL, {
            method: "POST",
            body: JSON.stringify({
                model: "ilmu-glm-5.1",
                messages: [
                    { 
                        role: "system", 
                        content: "Extract rental data precisely. Return ONLY a valid JSON array. Format: [{\"area_name\":\"string\",\"monthly_rent\":number,\"estimated_distance_km\":number}]" 
                    },
                    { 
                        role: "user", 
                        content: `Workplace: ${userProfile.workplace}. Ads to parse: ${adInputs.join(" | ")}` 
                    }
                ]
            })
        });

        const data = await response.json();
        
        // REGEX TO EXTRACT JSON IF AI ADDS EXTRA TEXT
        const jsonMatch = data.choices[0].message.content.match(/\[.*\]/s);
        if (!jsonMatch) throw new Error("AI parsing failed.");
        
        const parsedData = JSON.parse(jsonMatch[0]);

        // MAP TO ANALYTICS ENGINE
        currentRankedAds = parsedData.map((item, index) => {
            return evaluateRentalOption({ ...item, adIndex: index + 1 }, userProfile);
        });

        // RANK BY DISPOSABLE INCOME (DESCENDING)
        currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);
        
        // RENDER RESULTS
        renderResultsUI(currentRankedAds);
        
        // UI TRANSITION
        loader.style.display = "none";
        document.getElementById("resultOverlay").style.display = "flex";
        document.body.style.overflow = "hidden"; // Prevent background scroll

        console.log("System: Analysis complete. UI rendered.");

    } catch (error) {
        console.error("Z-AI Fatal Error:", error);
        loader.style.display = "none";
        alert("System Error: AI failed to process the link. Please check formatting.");
    }
};

/**
 * 4. CONVERSATIONAL ENGINE: CHAT AS CALCULATOR (=)
 * Allows users to adjust values without leaving the result screen.
 */
window.processChatCommand = function () {
    const chatInput = document.getElementById("chatCommand");
    const cmd = chatInput.value.trim().toLowerCase();
    
    if (!cmd) return;

    console.log("Z-AI Terminal: Processing Command -> " + cmd);

    let isUpdated = false;
    let systemFeedback = "";

    // A. CHANGE RENT: "AD 1 rent 800"
    const rentRegex = /ad\s*(\d+).*?(?:rent|rm|price|is|=|sewa)\s*(\d+)/;
    const rentMatch = cmd.match(rentRegex);

    if (rentMatch) {
        const adId = parseInt(rentMatch[1]);
        const newPrice = parseFloat(rentMatch[2]);
        
        const targetAd = currentRankedAds.find(a => a.adIndex === adId);
        if (targetAd) {
            targetAd.monthly_rent = newPrice;
            isUpdated = true;
            systemFeedback = `Property AD ${adId} rent adjusted to RM ${newPrice}.`;
        }
    }

    // B. CHANGE SALARY: "Salary 6000"
    const salaryRegex = /(?:salary|gaji|income)\s*(?:is|=|to)?\s*(\d+)/;
    const salaryMatch = cmd.match(salaryRegex);

    if (salaryMatch) {
        userProfile.salary = parseFloat(salaryMatch[1]);
        isUpdated = true;
        systemFeedback = `Profile updated. Monthly salary is now RM ${userProfile.salary}.`;
    }

    // C. CHANGE DEPO BUDGET: "Depo 1500"
    const depoRegex = /(?:depo|deposit|budget)\s*(?:is|=|to)?\s*(\d+)/;
    const depoMatch = cmd.match(depoRegex);

    if (depoMatch) {
        userProfile.depositBudget = parseFloat(depoMatch[1]);
        isUpdated = true;
        systemFeedback = `Deposit budget adjusted to RM ${userProfile.depositBudget}.`;
    }

    if (isUpdated) {
        // RE-EVALUATE ALL PERSISTED DATA
        currentRankedAds = currentRankedAds.map(ad => {
            return evaluateRentalOption(ad, userProfile, true);
        });

        // RE-SORT RANKINGS BASED ON NEW CALCULATIONS
        currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);
        
        // RE-RENDER
        renderResultsUI(currentRankedAds);
        typeAssistantMessage(`Update Success: ${systemFeedback}`);
    } else {
        typeAssistantMessage("Z.AI: Command not recognized. Try 'AD 1 rent 900' or 'Salary 6000'");
    }

    chatInput.value = ""; // Clear input
};

/**
 * 5. UI RENDERER: RESULT CARDS & CHAT INTERFACE
 */
function renderResultsUI(ranked) {
    const container = document.getElementById("resultsContainer");
    
    // DYNAMIC HEADER
    const headerHtml = `
        <div class="mb-6 bg-slate-900 text-white p-7 rounded-[2.5rem] shadow-2xl border-b-8 border-blue-600 animate-fadeIn">
            <div class="flex justify-between items-end mb-6 border-b border-slate-800 pb-5">
                <div>
                    <p class="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Target Workplace</p>
                    <p class="text-3xl font-black tracking-tight">${userProfile.workplace}</p>
                </div>
                <div class="text-right">
                    <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Monthly Salary</p>
                    <p class="text-3xl font-black text-emerald-400 tracking-tight">RM ${userProfile.salary}</p>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div class="bg-slate-800/50 p-3 rounded-2xl text-center">
                    <p class="text-[8px] font-bold text-slate-500 uppercase mb-1">Commits</p>
                    <p class="text-[11px] font-black text-slate-200 uppercase">RM ${userProfile.commitments}</p>
                </div>
                <div class="bg-slate-800/50 p-3 rounded-2xl text-center">
                    <p class="text-[8px] font-bold text-slate-500 uppercase mb-1">Max Depo</p>
                    <p class="text-[11px] font-black text-slate-200 uppercase">RM ${userProfile.depositBudget}</p>
                </div>
                <div class="bg-slate-800/50 p-3 rounded-2xl text-center">
                    <p class="text-[8px] font-bold text-slate-500 uppercase mb-1">Transport</p>
                    <p class="text-[11px] font-black text-slate-200 uppercase">${userProfile.transportMode}</p>
                </div>
            </div>
        </div>
    `;

    // INDIVIDUAL PROPERTY CARDS
    const cardsHtml = `<div class="pb-64 space-y-5">` + ranked.map((item, idx) => `
        <div class="result-card p-7 bg-white border-2 ${idx === 0 ? 'border-emerald-500 shadow-2xl scale-[1.01]' : 'border-slate-50 shadow-sm'} rounded-[2.5rem] transition-all duration-500">
            <div class="flex justify-between items-start mb-4">
                <div class="bg-blue-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md">
                    RANK #${idx + 1} · AD ${item.adIndex}
                </div>
                <div class="status-tag ${item.status === 'PASSED' ? 'bg-green-100 text-green-700' : (item.status === 'RISK' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')} font-black px-4 py-1.5 rounded-full text-[9px] uppercase shadow-sm">
                    ${item.status}
                </div>
            </div>
            
            <h3 class="font-black text-3xl text-slate-800 leading-tight mb-1">${item.area_name}</h3>
            <p class="text-xs font-bold text-slate-400 mb-6 italic tracking-tight">📍 Located approximately ${item.estimated_distance_km}km from your workplace.</p>

            <div class="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 mb-6 shadow-inner">
                <p class="text-[9px] font-black text-slate-400 uppercase mb-3 underline tracking-widest italic">Cost of Living (COL) Analysis</p>
                <div class="text-[12px] font-bold text-slate-600 space-y-2">
                    <div class="flex justify-between text-blue-800 font-black">
                        <span>Monthly Rental:</span><span>RM ${item.monthly_rent}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Est. Transportation Cost:</span><span>RM ${item.transportCost}</span>
                    </div>
                    <div class="flex justify-between border-b border-slate-200 pb-2">
                        <span>Fixed Commits:</span><span>RM ${userProfile.commitments}</span>
                    </div>
                    <div class="flex justify-between pt-1 text-slate-900 font-black uppercase text-xs">
                        <span>TOTAL MONTHLY COST:</span><span>RM ${item.totalLivingCost}</span>
                    </div>
                </div>
            </div>

            <div class="mb-6 p-5 bg-blue-50 border-l-8 border-blue-500 rounded-r-[2rem]">
                <p class="text-[10px] font-black text-blue-700 uppercase mb-1 tracking-widest">Z.AI Analysis</p>
                <p class="text-[13px] font-bold text-blue-900 leading-snug">${item.zAiAnalysis}</p>
            </div>

            <div class="bg-blue-600 p-6 rounded-[2.5rem] text-white flex justify-between items-center shadow-xl shadow-blue-100 transition-all">
                <span class="text-[10px] font-black uppercase tracking-[0.2em]">Net Disposable Balance</span>
                <span class="text-3xl font-black tracking-tighter">RM ${item.disposableIncome.toFixed(0)}</span>
            </div>
        </div>
    `).join('') + `</div>`;

    // OVERLAY-ONLY CHAT UI CONSTRUCTION
    const chatHtml = `
        <div class="fixed bottom-0 left-0 right-0 p-5 bg-white/95 backdrop-blur-lg border-t border-slate-100 rounded-t-[3rem] shadow-2xl z-[150] animate-slideUp">
            <div id="aiMessageBox" class="max-h-24 overflow-y-auto mb-4 flex flex-col-reverse px-2 scroll-smooth">
                </div>
            
            <div class="flex items-center gap-3 bg-slate-100 p-2.5 rounded-full border border-slate-200 shadow-inner">
                <input id="chatCommand" 
                       type="text" 
                       class="flex-1 bg-transparent border-none outline-none px-5 text-sm font-bold text-slate-700 placeholder-slate-400" 
                       placeholder="Negotiate? (e.g. AD 1 rent 800)">
                <button onclick="processChatCommand()" 
                        class="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-black text-2xl shadow-lg transition-transform active:scale-90 hover:bg-blue-700">
                    =
                </button>
            </div>
        </div>
    `;

    // Inject all components into the result container
    container.innerHTML = headerHtml + cardsHtml + chatHtml;
    container.style.overflowY = "auto";
    container.style.maxHeight = "92vh";
}

/**
 * 6. UTILITY: ASSISTANT CHAT ANIMATION
 */
function typeAssistantMessage(msg) {
    const msgBox = document.getElementById("aiMessageBox");
    const bubble = document.createElement("div");
    
    bubble.className = "bg-slate-800 text-white text-[11px] font-black p-3 px-5 rounded-full mb-2 self-start shadow-xl animate-fadeIn border-l-4 border-blue-500";
    bubble.innerHTML = `<span class="text-blue-400 uppercase mr-1">System:</span> ${msg}`;
    
    msgBox.prepend(bubble);
}

/**
 * 7. UI GLOBAL ACTIONS
 */
window.closeResults = () => {
    console.log("System: Closing results overlay...");
    document.getElementById("resultOverlay").style.display = "none";
    document.body.style.overflow = "auto"; // Re-enable background scrolling
};

window.resetFullForm = () => {
    if (confirm("System Action: Reset all decision intelligence data?")) {
        location.reload();
    }
};

// Global Listeners for UX
document.addEventListener('keypress', (e) => {
    // Submit Chat Command on Enter key
    if (e.key === 'Enter' && document.activeElement.id === 'chatCommand') {
        processChatCommand();
    }
});

console.log("Z-AI: Decision Engine initialized and ready for deployment.");
