/**
 * ============================================================
 * SMARTRENT AI | DECISION INTELLIGENCE ENGINE
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

// Google Apps Script Proxy for Z.AI GLM (ilmu-glm-5.1)
const GOOGLE_PROXY_URL = "https://script.google.com/macros/s/AKfycbyTlrixa43Psv9xyybmKi7qkF4dyJRavltMmMkzfXwSF3hQqAoGhW-WQuPvzynUDRDVEQ/exec";

/**
 * 1. DYNAMIC UI: RENTAL AD INPUTS
 */
window.addRentalAd = function () {
    if (adCounter >= 5) {
        alert("System Limit: Maximum 5 properties for accurate decision intelligence.");
        return;
    }
    adCounter++;
    const container = document.getElementById("ads-dynamic-list");
    const newDiv = document.createElement("div");
    newDiv.className = "ad-entry flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 mb-2 shadow-sm animate-fadeIn";
    newDiv.innerHTML = `
        <span class="text-[10px] font-black text-slate-400 w-8">#0${adCounter}</span>
        <input class="ad-input flex-1 border-none bg-transparent outline-none text-sm font-bold text-slate-700" placeholder="Paste property details or ad text here...">
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

    // SUSTAINABILITY & DECISION LOGIC
    let status = "PASSED";
    let advice = isChatUpdate ? "Z.AI: Variables updated successfully." : "Z.AI: Optimal match found based on your profile.";

    if (leftover < 550) { // Safety buffer to avoid "Economic Blindness"
        status = "RISK";
        advice = "Z.AI: High Risk! Your monthly disposable income is below the RM 550 safety buffer.";
    } else if (distance > profile.maxDistance) {
        status = "CAUTION";
        advice = `Z.AI: Distance Alert! This property is ${distance}km away, exceeding your ${profile.maxDistance}km preference.`;
    } else if (depositRequired > profile.depositBudget) {
        status = "CAUTION";
        advice = `Z.AI: Capital Barrier! You are RM ${depositRequired - profile.depositBudget} short for the required 1+1 deposit.`;
    } else if (rent > (profile.salary * 0.35)) {
        status = "CAUTION";
        advice = "Z.AI: Rent exceeds 35% of your income. This may limit long-term savings potential.";
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
    // Capture user profile data
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
    // Truncate ad inputs to ensure we stay within LLM context limits
    const MAX_CHARS = 6000; 
    const safeAds = adInputs.map(input => input.substring(0, MAX_CHARS));

    if (!userProfile.salary || safeAds.length === 0) {
        alert("System Validation: Please provide your Monthly Salary and at least 1 Rental Advertisement.");
        return;
    }

    document.getElementById("loadingOverlay").style.display = "flex";

    try {
        // Trigger Z.AI GLM Reasoning Engine
        const res = await fetch(GOOGLE_PROXY_URL, {
            method: "POST",
            body: JSON.stringify({
                model: "ilmu-glm-5.1",
                messages: [
                    { 
                        role: "system", 
                        content: "Extract rental data. Return JSON array ONLY: [{\"area_name\":\"string\",\"monthly_rent\":number,\"estimated_distance_km\":number}]" 
                    },
                    { 
                        role: "user", 
                        content: `Workplace Location: ${userProfile.workplace}. Ads: ${safeAds.join(" | ")}` 
                    }
                ]
            })
        });

        const data = await res.json();
        // Fallback & Failure Behavior
        const jsonMatch = data.choices[0].message.content.match(/\[.*\]/s);
        if (!jsonMatch) throw new Error("Invalid AI Response Structure");
        
        const parsed = JSON.parse(jsonMatch[0]);

        // Process options and rank by disposable income
        currentRankedAds = parsed.map((item, i) => evaluateRentalOption({...item, adIndex: i+1}, userProfile));
        currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);

        renderResultsUI(currentRankedAds);
        document.getElementById("loadingOverlay").style.display = "none";
        document.getElementById("resultOverlay").style.display = "flex";
        document.body.style.overflow = "hidden";

    } catch (err) {
        console.error("AI Bridge Error:", err);
        document.getElementById("loadingOverlay").style.display = "none";
        alert("Z.AI Engine is experiencing high traffic. Please wait 5 seconds and retry.");
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
    
    // Regex for Rent updates (e.g. "AD 1 rent is 900")
    const rentMatch = cmd.match(/ad\s*(\d+).*?(?:rent|rm|price|=|is)\s*(\d+)/);
    // Regex for Salary updates (e.g. "Update salary to 6000")
    const salaryMatch = cmd.match(/(?:salary|income|gaji)\s*(?:is|=|to)?\s*(\d+)/);

    if (rentMatch) {
        const adNum = parseInt(rentMatch[1]);
        const ad = currentRankedAds.find(a => a.adIndex === adNum);
        if (ad) { 
            ad.monthly_rent = parseFloat(rentMatch[2]); 
            updated = true; 
            feedback = `Property AD ${adNum} rent adjusted to RM ${ad.monthly_rent}.`;
        }
    } else if (salaryMatch) {
        userProfile.salary = parseFloat(salaryMatch[1]); 
        updated = true;
        feedback = `Monthly salary updated to RM ${userProfile.salary}.`;
    }

    if (updated) {
        // Re-calculate everything based on new variables
        currentRankedAds = currentRankedAds.map(ad => evaluateRentalOption(ad, userProfile, true));
        currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);
        renderResultsUI(currentRankedAds);
        typeAssistantMessage(`Intelligence Re-calculated: ${feedback}`);
    }
    input.value = "";
};

/**
 * 5. COMPACT SIDE-BY-SIDE RENDERER
 */
function renderResultsUI(ranked) {
    const container = document.getElementById("resultsContainer");
    
    // Comprehensive Report Header
    const header = `
        <div class="mb-6 bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl border-b-4 border-blue-600 animate-fadeIn">
            <div class="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <div>
                    <p class="text-[8px] text-blue-500 uppercase font-black tracking-widest">Workplace Destination</p>
                    <p class="text-2xl font-black">${userProfile.workplace}</p>
                </div>
                <div class="text-right">
                    <p class="text-[8px] text-emerald-500 uppercase font-black tracking-widest">Net Monthly Salary</p>
                    <p class="text-2xl font-black text-emerald-400">RM ${userProfile.salary}</p>
                </div>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-[9px] font-black uppercase tracking-wider">
                <div class="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                    <p class="text-slate-500 mb-1">🚗 Transport Mode</p>
                    <p class="text-white">${userProfile.transportMode}</p>
                </div>
                <div class="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                    <p class="text-slate-500 mb-1">📍 Max Distance</p>
                    <p class="text-white">${userProfile.maxDistance} KM Radius</p>
                </div>
                <div class="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                    <p class="text-slate-500 mb-1">💳 Fixed Bills</p>
                    <p class="text-white">RM ${userProfile.commitments}</p>
                </div>
                <div class="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                    <p class="text-slate-500 mb-1">🏦 Deposit Cap</p>
                    <p class="text-white">RM ${userProfile.depositBudget}</p>
                </div>
            </div>
        </div>
    `;

    // Visual Ranking Grid
    const grid = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">` + ranked.map((item, idx) => `
        <div class="p-5 bg-white border-2 ${idx === 0 ? 'border-emerald-500 shadow-xl scale-[1.03]' : 'border-slate-100'} rounded-[2.5rem] flex flex-col justify-between transition-all duration-300">
            <div>
                <div class="flex justify-between items-start mb-3">
                    <span class="bg-blue-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">Option ${item.adIndex}</span>
                    <div class="text-right">
                        <span class="${item.status === 'PASSED' ? 'text-green-600' : (item.status === 'RISK' ? 'text-red-600' : 'text-amber-600')} font-black text-[9px] uppercase tracking-widest block">${item.status}</span>
                        <p class="text-[7px] font-bold text-slate-300 uppercase mt-0.5">Decision Status</p>
                    </div>
                </div>
                
                <h3 class="font-black text-xl text-slate-800 truncate mb-1 leading-none">${item.area_name}</h3>
                <p class="text-[10px] font-bold text-slate-400 mb-5 italic">📍 ~${item.estimated_distance_km} KM from your workplace</p>
                
                <div class="bg-slate-50 p-4 rounded-2xl text-[11px] font-bold text-slate-600 space-y-2 mb-4 border border-slate-100/50">
                    <div class="flex justify-between text-blue-900"><span>Monthly Rent:</span><span>RM ${item.monthly_rent}</span></div>
                    <div class="flex justify-between"><span>Est. Travel Cost:</span><span>RM ${item.transportCost}</span></div>
                    <div class="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-sm"><span>TOTAL (COL):</span><span>RM ${item.totalLivingCost}</span></div>
                </div>
                
                <p class="text-[10px] font-bold text-blue-900 leading-tight mb-6 p-4 bg-blue-50/70 rounded-2xl border-l-4 border-blue-600 shadow-sm">${item.advice}</p>
            </div>
            
            <div class="bg-blue-600 p-4 rounded-2xl text-white flex justify-between items-center shadow-lg transform active:scale-95 transition-transform">
                <div class="leading-none">
                    <span class="text-[8px] font-black uppercase tracking-widest opacity-70">Disposable Balance</span>
                    <p class="text-[6px] font-bold uppercase opacity-50">Remaining monthly cash</p>
                </div>
                <span class="text-2xl font-black">RM ${item.disposableIncome.toFixed(0)}</span>
            </div>
        </div>
    `).join('') + `</div>`;

    // Integrated Conversational UI
    const chat = `
        <div class="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.1)] z-[150]">
            <div id="aiMessageBox" class="max-h-16 overflow-y-auto mb-3 text-[9px] font-black text-blue-700 flex flex-col-reverse px-4"></div>
            <div class="max-w-2xl mx-auto flex items-center gap-3 bg-slate-100 p-2 rounded-full border border-slate-200 shadow-inner">
                <input id="chatCommand" type="text" class="flex-1 bg-transparent px-6 text-xs font-bold outline-none text-slate-700 placeholder-slate-400" placeholder="Negotiate rent or update salary? (e.g. 'AD 1 rent is 900')">
                <button onclick="processChatCommand()" class="bg-blue-600 text-white w-12 h-12 rounded-full font-black text-2xl shadow-xl hover:bg-blue-700 active:scale-90 transition-all flex items-center justify-center">=</button>
            </div>
        </div>
    `;

    container.innerHTML = header + grid + chat;
}

/**
 * 6. SYSTEM UTILITIES & EVENT HANDLERS
 */
function typeAssistantMessage(msg) {
    const box = document.getElementById("aiMessageBox");
    const div = document.createElement("div");
    div.className = "mb-1 animate-fadeIn border-l-2 border-blue-600 pl-2 py-0.5";
    div.innerHTML = `<span class="opacity-40 uppercase mr-2">Z.AI</span> ${msg}`;
    box.prepend(div);
}

window.closeResults = () => { 
    document.getElementById("resultOverlay").style.display = "none"; 
    document.body.style.overflow = "auto"; 
};

window.resetFullForm = () => { 
    if (confirm("System Action Required: Do you want to reset all decision intelligence data and financial profiles?")) {
        location.reload(); 
    }
};

// Listen for global execution triggers
document.addEventListener('keypress', (e) => { 
    if (e.key === 'Enter' && document.activeElement.id === 'chatCommand') {
        processChatCommand(); 
    }
});