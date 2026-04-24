/**
 * ============================================================
 * SMARTRENT AI | DECISION INTELLIGENCE ENGINE
 * VERSION: 13.5.0 (FINAL PRODUCTION RELEASE)
 * BRIDGE: Google Apps Script Proxy (CORS-Bypass)
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

const GOOGLE_PROXY_URL = "https://script.google.com/macros/s/AKfycbyTlrixa43Psv9xyybmKi7qkF4dyJRavltMmMkzfXwSF3hQqAoGhW-WQuPvzynUDRDVEQ/exec";

/**
 * 1. DYNAMIC UI: RENTAL AD INPUTS
 */
window.addRentalAd = function () {
    if (adCounter >= 5) {
        alert("System Limit: Max 5 ads for precise decision intelligence.");
        return;
    }
    adCounter++;
    const container = document.getElementById("ads-dynamic-list");
    const newDiv = document.createElement("div");
    newDiv.className = "ad-entry flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 mb-2 shadow-sm animate-fadeIn";
    newDiv.innerHTML = `
        <span class="text-[10px] font-black text-slate-400 w-8">#0${adCounter}</span>
        <input class="ad-input flex-1 border-none bg-transparent outline-none text-sm font-bold text-slate-700" placeholder="Paste property details...">
        <button onclick="this.parentElement.remove(); adCounter--;" class="text-red-400 hover:text-red-600 font-bold w-8 h-8">✕</button>
    `;
    container.appendChild(newDiv);
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

    // SUSTAINABILITY LOGIC (TALLIES WITH PRD)
    let status = "PASSED";
    let advice = isChatUpdate ? "Z.AI: Variables updated successfully." : "Z.AI: Optimal match found.";

    if (leftover < 550) {
        status = "RISK";
        advice = "Z.AI: High Risk! Disposable income is below the RM 550 safety buffer.";
    } else if (depositRequired > profile.depositBudget) {
        status = "CAUTION";
        advice = `Z.AI: Capital Barrier! Short RM ${depositRequired - profile.depositBudget} for deposit.`;
    } else if (rent > (profile.salary * 0.35)) {
        status = "CAUTION";
        advice = "Z.AI: Rent exceeds 35% of income. Limits long-term savings.";
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
        transportMode: document.getElementById("transport_mode").value
    };

    const adInputs = Array.from(document.querySelectorAll(".ad-input"))
        .map(inp => inp.value.trim()).filter(v => v !== "");

    // TOKEN MANAGEMENT MODULE (SAD Section 2.1.2)
    const MAX_CHARS = 6000; 
    const safeAds = adInputs.map(input => input.substring(0, MAX_CHARS));

    if (!userProfile.salary || safeAds.length === 0) {
        alert("Please enter Salary and at least 1 Ad.");
        return;
    }

    document.getElementById("loadingOverlay").style.display = "flex";

    try {
        const res = await fetch(GOOGLE_PROXY_URL, {
            method: "POST",
            body: JSON.stringify({
                model: "ilmu-glm-5.1",
                messages: [
                    { role: "system", content: "Extract rental data. Return JSON array: [{\"area_name\":\"string\",\"monthly_rent\":number,\"estimated_distance_km\":number}]" },
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
        alert("AI Engine busy. Please retry.");
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
    const rentMatch = cmd.match(/ad\s*(\d+).*?(?:rent|rm|price|=|is)\s*(\d+)/);
    const salaryMatch = cmd.match(/(?:salary|income|gaji)\s*(?:is|=|to)?\s*(\d+)/);

    if (rentMatch) {
        const ad = currentRankedAds.find(a => a.adIndex === parseInt(rentMatch[1]));
        if (ad) { ad.monthly_rent = parseFloat(rentMatch[2]); updated = true; }
    } else if (salaryMatch) {
        userProfile.salary = parseFloat(salaryMatch[1]); updated = true;
    }

    if (updated) {
        currentRankedAds = currentRankedAds.map(ad => evaluateRentalOption(ad, userProfile, true));
        currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);
        renderResultsUI(currentRankedAds);
        typeAssistantMessage("Values recalculated.");
    }
    input.value = "";
};

/**
 * 5. COMPACT SIDE-BY-SIDE RENDERER
 */
function renderResultsUI(ranked) {
    const container = document.getElementById("resultsContainer");
    
    const header = `
        <div class="mb-4 bg-slate-900 text-white p-5 rounded-[1.5rem] shadow-lg border-b-4 border-blue-600">
            <div class="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                <div><p class="text-[8px] text-blue-500 uppercase font-black">Workplace</p><p class="text-xl font-black">${userProfile.workplace}</p></div>
                <div class="text-right"><p class="text-[8px] text-slate-500 uppercase font-black">Salary</p><p class="text-xl font-black text-emerald-400">RM ${userProfile.salary}</p></div>
            </div>
            <div class="flex justify-around text-[10px] font-black text-slate-300 uppercase">
                <span>Bills: RM ${userProfile.commitments}</span><span>Budget: RM ${userProfile.depositBudget}</span>
            </div>
        </div>
    `;

    const grid = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-48">` + ranked.map((item, idx) => `
        <div class="p-4 bg-white border-2 ${idx === 0 ? 'border-emerald-500 shadow-md' : 'border-slate-100'} rounded-[1.5rem] flex flex-col justify-between">
            <div>
                <div class="flex justify-between mb-2">
                    <span class="bg-blue-600 text-white text-[7px] font-black px-2 py-1 rounded-full uppercase">#${idx + 1} AD ${item.adIndex}</span>
                    <span class="${item.status === 'PASSED' ? 'text-green-600' : (item.status === 'RISK' ? 'text-red-600' : 'text-amber-600')} font-black text-[7px] uppercase">${item.status}</span>
                </div>
                <h3 class="font-black text-base text-slate-800 truncate">${item.area_name}</h3>
                <p class="text-[9px] font-bold text-slate-400 mb-2">📍 ~${item.estimated_distance_km}km distance</p>
                <div class="bg-slate-50 p-3 rounded-xl text-[10px] font-bold text-slate-600 space-y-1 mb-3">
                    <div class="flex justify-between"><span>Rent:</span><span>RM ${item.monthly_rent}</span></div>
                    <div class="flex justify-between"><span>Travel:</span><span>RM ${item.transportCost}</span></div>
                    <div class="flex justify-between border-t pt-1 font-black text-slate-900"><span>TOTAL:</span><span>RM ${item.totalLivingCost}</span></div>
                </div>
                <p class="text-[9px] font-bold text-blue-900 leading-tight mb-4 italic">${item.advice}</p>
            </div>
            <div class="bg-blue-600 p-3 rounded-xl text-white flex justify-between items-center">
                <span class="text-[7px] font-black uppercase">Disposable</span>
                <span class="text-base font-black">RM ${item.disposableIncome.toFixed(0)}</span>
            </div>
        </div>
    `).join('') + `</div>`;

    const chat = `
        <div class="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-2xl z-[150]">
            <div id="aiMessageBox" class="max-h-12 overflow-y-auto mb-2 text-[10px] font-bold text-blue-600"></div>
            <div class="max-w-xl mx-auto flex items-center gap-2 bg-slate-100 p-1 rounded-full">
                <input id="chatCommand" type="text" class="flex-1 bg-transparent px-4 text-xs font-bold outline-none" placeholder="FALSE INFORMATION?PLEASE PUT THE CORRECT INFORMATION">
                <button onclick="processChatCommand()" class="bg-blue-600 text-white w-9 h-9 rounded-full font-black">=</button>
            </div>
        </div>
    `;

    container.innerHTML = header + grid + chat;
}

function typeAssistantMessage(msg) {
    const box = document.getElementById("aiMessageBox");
    const div = document.createElement("div");
    div.innerText = "Z.AI: " + msg;
    box.prepend(div);
}

window.closeResults = () => { document.getElementById("resultOverlay").style.display = "none"; document.body.style.overflow = "auto"; };
window.resetFullForm = () => { if (confirm("Reset data?")) location.reload(); };

document.addEventListener('keypress', (e) => { if (e.key === 'Enter' && document.activeElement.id === 'chatCommand') processChatCommand(); });
