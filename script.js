/**
 * ============================================================
 * SMARTRENT AI | DECISION INTELLIGENCE ENGINE
 * VERSION : 13.5.0 (FINAL PRODUCTION DEPLOYMENT)
 * CORE REASONING: Z.AI GLM (ilmu-glm-5.1)
 * PROJECT: PENGUIN_UMHACKATHON2026
 * DEVELOPER: TANIA DANISHA PUTERI
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
    transportMode: "Car",
    maxDistance: 15
};

// SERVERLESS RELAY: Google Apps Script Proxy
const GOOGLE_PROXY_URL = "https://script.google.com/macros/s/AKfycbxqbEdjRiept1Sk9C89OACVK_UCJ62B78bowUA7TqgMCGb1iaEV8oeogGjpP7G6S0kUqw/exec";

/**
 * 1. DYNAMIC UI: RENTAL AD INPUT MANAGEMENT
 */
window.addRentalAd = function () {
    if (adCounter >= 5) { // Scope Control: Max 5 ads
        alert("System Limit: Maximum 5 properties for precise decision intelligence.");
        return;
    }
    adCounter++;
    const container = document.getElementById("ads-dynamic-list");
    const newDiv = document.createElement("div");
    newDiv.className = "ad-entry flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 mb-2 shadow-sm animate-fadeIn";
    newDiv.innerHTML = `
        <span class="text-[10px] font-black text-slate-400 w-8">#0${adCounter}</span>
        <input class="ad-input flex-1 border-none bg-transparent outline-none text-sm font-bold text-slate-700" placeholder="Paste property text here...">
        <button onclick="removeAdField(this)" class="text-red-400 hover:text-red-600 font-bold w-8 h-8">✕</button>
    `;
    container.appendChild(newDiv);
};

window.removeAdField = function (btn) {
    btn.parentElement.remove();
    adCounter--;
};

/**
 * 2. ANALYTICS ENGINE: REAL COST OF LIVING (COL)
 */
function evaluateRentalOption(propertyRaw, profile, isChatUpdate = false) {
    const rent = parseFloat(propertyRaw.monthly_rent) || 0;
    const distance = parseFloat(propertyRaw.estimated_distance_km) || 0;
    
    // TRANSPORT LOGIC MODULE
    let transportCost = 0;
    if (profile.transportMode === "Car") {
        transportCost = Math.round(distance * 0.65 * 2 * 22 + 70);
    } else if (profile.transportMode === "Public Transport") {
        transportCost = Math.round(Math.min(11, distance * 0.45 + 2) * 22);
    } else if (profile.transportMode === "Walk") {
        transportCost = 20;
    }

    const totalCOL = rent + transportCost + profile.commitments;
    const leftover = profile.salary - totalCOL;
    const depositRequired = rent * 2;

    // SUSTAINABILITY SAFETY BUFFER (RM 550)
    let status = "PASSED";
    let advice = isChatUpdate ? "Z.AI: Intelligence re-calculated via intent parsing." : "Z.AI: Optimal match found based on your profile.";

    if (leftover < 550) { 
        status = "RISK";
        advice = "Z.AI: High Risk! Disposable income is below the RM 550 safety buffer.";
    } else if (distance > profile.maxDistance) {
        status = "CAUTION";
        advice = `Z.AI: Distance Alert! This property is ${distance}km away, exceeding your ${profile.maxDistance}km preference.`;
    } else if (depositRequired > profile.depositBudget) {
        status = "CAUTION";
        advice = `Z.AI: Capital Barrier! You are RM ${depositRequired - profile.depositBudget} short for the required deposit.`;
    }

    return {
        ...propertyRaw,
        monthly_rent: rent,
        estimated_distance_km: distance,
        transportCost,
        totalLivingCost: totalCOL,
        disposableIncome: Math.max(0, leftover),
        status,
        advice,
        adIndex: propertyRaw.adIndex
    };
}

/**
 * 3. CORE SERVICE: PROMPT-TO-ANALYSIS FLOW
 */
window.runSmartAnalysis = async function () {
    // CAPTURE FINANCIAL PROFILE & COMMUTE LOGISTICS
    userProfile = {
        salary: parseFloat(document.getElementById("salary").value) || 0,
        commitments: parseFloat(document.getElementById("commitments").value) || 0,
        depositBudget: parseFloat(document.getElementById("deposit_budget").value) || 0,
        workplace: document.getElementById("workplace").value.trim().toUpperCase() || "KLCC",
        transportMode: document.getElementById("transport_mode").value,
        maxDistance: parseFloat(document.getElementById("max_distance").value) || 15
    };

    const adInputs = Array.from(document.querySelectorAll(".ad-input"))
        .map(inp => inp.value.trim()).filter(v => v !== "");

    // TOKEN MANAGEMENT: TRUNCATE TO 1500 TOKENS
    const sanitizedAds = adInputs.map(text => text.substring(0, 4000));

    if (!userProfile.salary || sanitizedAds.length === 0) {
        alert("System Validation: Please provide your Salary and at least one Rental Advertisement.");
        return;
    }

    document.getElementById("loadingOverlay").style.display = "flex";

    try {
        const res = await fetch(GOOGLE_PROXY_URL, {
            method: "POST",
            body: JSON.stringify({
                model: "ilmu-glm-5.1",
                messages: [
                    { 
                        role: "system", 
                        content: "Analyze rental ads. Output valid JSON array ONLY: [{\"area_name\":\"string\",\"monthly_rent\":number,\"estimated_distance_km\":number}]" 
                    },
                    { role: "user", content: `User Workplace: ${userProfile.workplace}. Ads: ${sanitizedAds.join(" | ")}` }
                ]
            })
        });

        const rawResponse = await res.text();
        const data = JSON.parse(rawResponse);
        
        const jsonMatch = data.choices[0].message.content.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(jsonMatch[0]);

        // MULTI-OPTION RANKING FLOW
        currentRankedAds = parsed.map((item, i) => evaluateRentalOption({...item, adIndex: i+1}, userProfile));
        currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);

        renderResultsUI(currentRankedAds);
        document.getElementById("loadingOverlay").style.display = "none";
        document.getElementById("resultOverlay").style.display = "flex";
        document.body.style.overflow = "hidden";

    } catch (err) {
        document.getElementById("loadingOverlay").style.display = "none";
        console.error("AI Logic Error:", err);
        alert("Z.AI Note: Please paste the FULL AD TEXT instead of a link for accurate parsing.");
    }
};

/**
 * 4. CONVERSATIONAL LOGIC EDITING
 */
window.processChatCommand = async function () {
    const input = document.getElementById("chatCommand");
    const cmd = input.value.trim();
    if (!cmd) return;

    typeAssistantMessage("Analyzing intent...");

    try {
        const res = await fetch(GOOGLE_PROXY_URL, {
            method: "POST",
            body: JSON.stringify({
                model: "ilmu-glm-5.1",
                messages: [
                    { 
                        role: "system", 
                        content: "Al Intent Parsing. Return JSON ONLY: {\"target\": \"ad\"|\"profile\", \"index\": number|null, \"key\": \"monthly_rent\"|\"salary\"|\"estimated_distance_km\"|\"commitments\"|\"maxDistance\", \"value\": number}" 
                    },
                    { role: "user", content: `Command: "${cmd}". Context: Salary ${userProfile.salary}, Ads 1-${currentRankedAds.length}.` }
                ]
            })
        });

        const data = await res.json();
        const jsonMatch = data.choices[0].message.content.match(/\{.*\}/s);
        const update = JSON.parse(jsonMatch[0]);

        if (update.target === "ad" && update.index) {
            const ad = currentRankedAds.find(a => a.adIndex === update.index);
            if (ad) {
                ad[update.key] = update.value;
                typeAssistantMessage(`Updated AD ${update.index} ${update.key} to ${update.value}.`);
            }
        } else if (update.target === "profile") {
            userProfile[update.key] = update.value;
            typeAssistantMessage(`Updated Profile ${update.key} to ${update.value}.`);
        }

        currentRankedAds = currentRankedAds.map(ad => evaluateRentalOption(ad, userProfile, true));
        currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);
        renderResultsUI(currentRankedAds);

    } catch (err) {
        typeAssistantMessage("I couldn't process that command. Try: 'AD 1 rent 1000'");
    }
    input.value = "";
};

/**
 * 5. UI RENDERER: COMPARISON CANVAS
 */
function renderResultsUI(ranked) {
    const container = document.getElementById("resultsContainer");
    
    const header = `
        <div class="mb-6 bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl border-b-4 border-blue-600 animate-fadeIn">
            <div class="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <div><p class="text-[8px] text-blue-500 uppercase font-black tracking-widest">Workplace</p><p class="text-2xl font-black">${userProfile.workplace}</p></div>
                <div class="text-right"><p class="text-[8px] text-emerald-500 uppercase font-black tracking-widest">Monthly Income</p><p class="text-2xl font-black text-emerald-400">RM ${userProfile.salary}</p></div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-[9px] font-black uppercase tracking-wider text-slate-400">
                <div class="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50"><p>Transport</p><p class="text-white">${userProfile.transportMode}</p></div>
                <div class="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50"><p>Max Distance</p><p class="text-white">${userProfile.maxDistance} KM</p></div>
                <div class="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50"><p>Commitments</p><p class="text-white">RM ${userProfile.commitments}</p></div>
                <div class="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50"><p>Deposit Cap</p><p class="text-white">RM ${userProfile.depositBudget}</p></div>
            </div>
        </div>
    `;

    const grid = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">` + ranked.map((item, idx) => `
        <div class="p-5 bg-white border-2 ${idx === 0 ? 'border-emerald-500 shadow-xl scale-[1.03]' : 'border-slate-100'} rounded-[2.5rem] flex flex-col justify-between transition-all duration-300">
            <div>
                <div class="flex justify-between mb-2">
                    <span class="bg-blue-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">#AD ${item.adIndex}</span>
                    <span class="${item.status === 'PASSED' ? 'text-green-600' : 'text-amber-600'} font-black text-[9px] uppercase tracking-widest">${item.status}</span>
                </div>
                <h3 class="font-black text-lg text-slate-800 truncate mb-1">${item.area_name}</h3>
                <p class="text-[10px] font-bold text-slate-400 mb-4 italic">📍 ~${item.estimated_distance_km} KM commute</p>
                <div class="bg-slate-50 p-4 rounded-2xl text-[11px] font-bold text-slate-600 space-y-2 mb-4">
                    <div class="flex justify-between"><span>Rental Price:</span><span>RM ${item.monthly_rent}</span></div>
                    <div class="flex justify-between"><span>Logistics Cost:</span><span>RM ${item.transportCost}</span></div>
                    <div class="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900"><span>REAL COST (COL):</span><span>RM ${item.totalLivingCost}</span></div>
                </div>
                <p class="text-[10px] font-bold text-blue-900 leading-tight mb-6 p-3 bg-blue-50 rounded-xl border-l-4 border-blue-600">${item.advice}</p>
            </div>
            <div class="bg-blue-600 p-4 rounded-2xl text-white flex justify-between items-center shadow-lg">
                <span class="text-[8px] font-black uppercase tracking-widest">Leftover Cash</span>
                <span class="text-xl font-black">RM ${item.disposableIncome.toFixed(0)}</span>
            </div>
        </div>
    `).join('') + `</div>`;

    const chat = `
        <div class="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-2xl z-[150]">
            <div id="aiMessageBox" class="max-h-16 overflow-y-auto mb-2 text-[9px] font-bold text-blue-700 flex flex-col-reverse px-4"></div>
            <div class="max-w-xl mx-auto flex items-center gap-2 bg-slate-100 p-1.5 rounded-full border border-slate-200 shadow-inner">
                <input id="chatCommand" type="text" class="flex-1 bg-transparent px-5 text-xs font-bold outline-none text-slate-700" placeholder="Update profile? (e.g. Salary 5000)">
                <button onclick="processChatCommand()" class="bg-blue-600 text-white w-10 h-10 rounded-full font-black text-xl shadow-lg hover:bg-blue-700 transition-colors">=</button>
            </div>
        </div>
    `;

    container.innerHTML = header + grid + chat;
}

/**
 * 6. UTILITY FUNCTIONS
 */
function typeAssistantMessage(msg) {
    const box = document.getElementById("aiMessageBox");
    if (!box) return;
    const div = document.createElement("div");
    div.className = "mb-1 animate-fadeIn";
    div.innerText = "System: " + msg;
    box.prepend(div);
}

window.closeResults = () => { 
    document.getElementById("resultOverlay").style.display = "none";
    document.body.style.overflow = "auto";
};

document.addEventListener('keypress', (e) => { 
    if (e.key === 'Enter' && document.activeElement.id === 'chatCommand') {
        processChatCommand();
    }
});
