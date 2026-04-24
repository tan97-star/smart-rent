/**
 * ============================================================
 * SMARTRENT AI | DECISION INTELLIGENCE ENGINE
 * BRIDGE: Google Apps Script Proxy (Bypass CORS)
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

const GOOGLE_PROXY_URL = "https://script.google.com/macros/s/AKfycbyTlrixa43Psv9xyybmKi7qkF4dyJRavltMmMkzfXwSF3hQqAoGhW-WQuPvzynUDRDVEQ/exec";

/**
 * 1. DYNAMIC UI: RENTAL AD INPUTS
 */
window.addRentalAd = function () {
    if (adCounter >= 5) {
        alert("System Limit: Max 5 properties for decision accuracy.");
        return;
    }
    adCounter++;
    const container = document.getElementById("ads-dynamic-list");
    const newDiv = document.createElement("div");
    newDiv.className = "ad-entry flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 mb-2 shadow-sm animate-fadeIn";
    newDiv.innerHTML = `
        <span class="text-[10px] font-black text-slate-400 w-8">#0${adCounter}</span>
        <input class="ad-input flex-1 border-none bg-transparent outline-none text-sm font-bold text-slate-700" placeholder="Paste details...">
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
    
    // 3-MODE TRANSPORT LOGIC
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

    // DECISION INTELLIGENCE LOGIC
    let status = "PASSED";
    let advice = isChatUpdate ? "Z.AI: Variables updated. Negotiation success!" : "Z.AI: Optimal match found.";

    if (leftover < 550) { // Threshold for Economic Blindness
        status = "RISK";
        advice = "Z.AI: High Risk! Disposable income is below the RM 550 safety buffer.";
    } else if (distance > profile.maxDistance) {
        status = "CAUTION";
        advice = `Z.AI: Distance Alert! Property is ${distance}km away, exceeding your ${profile.maxDistance}km preference.`;
    } else if (depositRequired > profile.depositBudget) {
        status = "CAUTION";
        advice = `Z.AI: Capital Barrier! You are RM ${depositRequired - profile.depositBudget} short for the 1+1 deposit.`;
    } else if (rent > (profile.salary * 0.35)) {
        status = "CAUTION";
        advice = "Z.AI: Rent exceeds 35% of income. Limits long-term savings potential.";
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
 * 3. MAIN SERVICE: ANALYZE & RANK
 */
window.runSmartAnalysis = async function () {
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

    // TOKEN MANAGEMENT MODULE
    const MAX_CHARS = 6000; // Truncate to ~1,500 tokens
    const safeAds = adInputs.map(input => input.substring(0, MAX_CHARS));

    if (!userProfile.salary || safeAds.length === 0) {
        alert("System Validation: Please enter Salary and at least 1 Advertisement.");
        return;
    }

    document.getElementById("loadingOverlay").style.display = "flex";

    try {
        const res = await fetch(GOOGLE_PROXY_URL, {
            method: "POST",
            body: JSON.stringify({
                model: "ilmu-glm-5.1",
                messages: [
                    { role: "system", content: "Extract rental data. Return JSON array ONLY: [{\"area_name\":\"string\",\"monthly_rent\":number,\"estimated_distance_km\":number}]" },
                    { role: "user", content: `Workplace: ${userProfile.workplace}. Ads: ${safeAds.join(" | ")}` }
                ]
            })
        });

        const data = await res.json();
        const jsonMatch = data.choices[0].message.content.match(/\[.*\]/s);
        const parsed = JSON.parse(jsonMatch[0]);

        currentRankedAds = parsed.map((item, i) => evaluateRentalOption({...item, adIndex: i+1}, userProfile));
        currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);

        renderResultsUI(currentRankedAds);
        document.getElementById("loadingOverlay").style.display = "none";
        document.getElementById("resultOverlay").style.display = "flex";
        document.body.style.overflow = "hidden";

    } catch (err) {
        document.getElementById("loadingOverlay").style.display = "none";
        alert("Z.AI Engine Busy. Please try again in 5 seconds.");
    }
};

/**
 * 4. CONVERSATIONAL LOGIC EDITING
 */
window.processChatCommand = function () {
    const input = document.getElementById("chatCommand");
    const cmd = input.value.trim().toLowerCase();
    if (!cmd) return;

    let updated = false;
    let feedback = "";
    
    // Support for multiple variables
    const rentMatch = cmd.match(/ad\s*(\d+).*?(?:rent|rm|price|=|is)\s*(\d+)/);
    const salaryMatch = cmd.match(/(?:salary|income|gaji)\s*(?:is|=|to)?\s*(\d+)/);

    if (rentMatch) {
        const adNum = parseInt(rentMatch[1]);
        const ad = currentRankedAds.find(a => a.adIndex === adNum);
        if (ad) { 
            ad.monthly_rent = parseFloat(rentMatch[2]); 
            updated = true; 
            feedback = `AD ${adNum} rent adjusted.`;
        }
    } else if (salaryMatch) {
        userProfile.salary = parseFloat(salaryMatch[1]); 
        updated = true;
        feedback = `Salary updated to RM ${userProfile.salary}.`;
    }

    if (updated) {
        currentRankedAds = currentRankedAds.map(ad => evaluateRentalOption(ad, userProfile, true));
        currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);
        renderResultsUI(currentRankedAds);
        typeAssistantMessage(`Logic Re-calculated: ${feedback}`);
    }
    input.value = "";
};

/**
 * 5. COMPACT SIDE-BY-SIDE RENDERER
 */
function renderResultsUI(ranked) {
    const container = document.getElementById("resultsContainer");
    
    const header = `
        <div class="mb-4 bg-slate-900 text-white p-5 rounded-[1.5rem] shadow-lg border-b-4 border-blue-600 animate-fadeIn">
            <div class="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                <div><p class="text-[8px] text-blue-500 uppercase font-black">Workplace</p><p class="text-xl font-black tracking-tight">${userProfile.workplace}</p></div>
                <div class="text-right"><p class="text-[8px] text-slate-500 uppercase font-black">Monthly Salary</p><p class="text-xl font-black text-emerald-400">RM ${userProfile.salary}</p></div>
            </div>
            <div class="flex justify-around text-[9px] font-black text-slate-300 uppercase tracking-widest">
                <span>Commitments: RM ${userProfile.commitments}</span>
                <span class="text-slate-600">|</span>
                <span>Deposit Budget: RM ${userProfile.depositBudget}</span>
            </div>
        </div>
    `;

    const grid = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-48">` + ranked.map((item, idx) => `
        <div class="p-4 bg-white border-2 ${idx === 0 ? 'border-emerald-500 shadow-md scale-[1.02]' : 'border-slate-100'} rounded-[1.5rem] flex flex-col justify-between transition-all duration-300">
            <div>
                <div class="flex justify-between mb-2">
                    <span class="bg-blue-600 text-white text-[7px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">#${idx + 1} AD ${item.adIndex}</span>
                    <span class="${item.status === 'PASSED' ? 'text-green-600' : (item.status === 'RISK' ? 'text-red-600' : 'text-amber-600')} font-black text-[7px] uppercase tracking-widest">${item.status}</span>
                </div>
                <h3 class="font-black text-base text-slate-800 truncate">${item.area_name}</h3>
                <p class="text-[9px] font-bold text-slate-400 mb-2 italic">📍 ~${item.estimated_distance_km}km from workplace</p>
                <div class="bg-slate-50 p-3 rounded-xl text-[10px] font-bold text-slate-600 space-y-1 mb-3">
                    <div class="flex justify-between text-blue-800 font-black"><span>Monthly Rent:</span><span>RM ${item.monthly_rent}</span></div>
                    <div class="flex justify-between"><span>Travel Costs:</span><span>RM ${item.transportCost}</span></div>
                    <div class="flex justify-between border-t border-slate-200 pt-1 font-black text-slate-900"><span>REAL COST (COL):</span><span>RM ${item.totalLivingCost}</span></div>
                </div>
                <p class="text-[9px] font-bold text-blue-900 leading-tight mb-4 bg-blue-50/50 p-2 rounded-lg border-l-4 border-blue-500">${item.advice}</p>
            </div>
            <div class="bg-blue-600 p-3 rounded-xl text-white flex justify-between items-center shadow-lg">
                <span class="text-[7px] font-black uppercase tracking-widest">Net Disposable Balance</span>
                <span class="text-base font-black">RM ${item.disposableIncome.toFixed(0)}</span>
            </div>
        </div>
    `).join('') + `</div>`;

    const chat = `
        <div class="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-2xl z-[150]">
            <div id="aiMessageBox" class="max-h-16 overflow-y-auto mb-2 text-[9px] font-bold text-blue-700 flex flex-col-reverse"></div>
            <div class="max-w-xl mx-auto flex items-center gap-2 bg-slate-100 p-1.5 rounded-full border border-slate-200 shadow-inner">
                <input id="chatCommand" type="text" class="flex-1 bg-transparent px-5 text-xs font-bold outline-none text-slate-700 placeholder-slate-400" placeholder="Negotiate? (e.g. AD 1 rent 800)">
                <button onclick="processChatCommand()" class="bg-blue-600 text-white w-10 h-10 rounded-full font-black text-xl shadow-lg hover:bg-blue-700 transition-colors">=</button>
            </div>
        </div>
    `;

    container.innerHTML = header + grid + chat;
}

/**
 * 6. UTILITY: MESSAGING & UI ACTIONS
 */
function typeAssistantMessage(msg) {
    const box = document.getElementById("aiMessageBox");
    const div = document.createElement("div");
    div.className = "mb-1 animate-fadeIn";
    div.innerText = "System: " + msg;
    box.prepend(div);
}

window.closeResults = () => { 
    document.getElementById("resultOverlay").style.display = "none"; 
    document.body.style.overflow = "auto"; 
};

window.resetFullForm = () => { 
    if (confirm("System Action: Reset all decision intelligence data?")) {
        location.reload(); 
    }
};

document.addEventListener('keypress', (e) => { 
    if (e.key === 'Enter' && document.activeElement.id === 'chatCommand') {
        processChatCommand(); 
    }
});
