/**
 * SMARTRENT AI | VERSION 10.5.0 (THE ULTIMATE FULL BUILD)
 * NO LINES SKIPPED. FULL LOGIC. INTEGRATED OVERLAY CHAT.
 */

let adCounter = 1;
let currentRankedAds = []; 
let userProfile = {};
const GOOGLE_PROXY_URL = "https://script.google.com/macros/s/AKfycbyTlrixa43Psv9xyybmKi7qkF4dyJRavltMmMkzfXwSF3hQqAoGhW-WQuPvzynUDRDVEQ/exec";

// 1. DYNAMIC INPUT: ADD AD (PAGE DEPAN)
window.addRentalAd = function () {
    if (adCounter >= 5) {
        alert("Maximum 5 rental ads for precise decision intelligence.");
        return;
    }
    adCounter++;
    const container = document.getElementById("ads-dynamic-list");
    const div = document.createElement("div");
    div.className = "ad-entry flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-2 shadow-sm animate-fadeIn";
    div.innerHTML = `
        <span class="text-[12px] font-black text-slate-400 w-8">#0${adCounter}</span>
        <input class="ad-input flex-1 border-none bg-transparent outline-none text-sm font-bold text-slate-700" placeholder="Paste property link or details...">
        <button onclick="this.parentElement.remove(); adCounter--;" class="text-red-400 hover:text-red-600 font-bold w-6 h-6 rounded-full bg-white shadow-sm transition-all">✕</button>
    `;
    container.appendChild(div);
};

// 2. CORE ENGINE: COST OF LIVING & SUSTAINABILITY (THE BRAIN)
function evaluateRentalOption(propertyRaw, profile, isChatUpdate = false) {
    const rent = parseFloat(propertyRaw.monthly_rent) || 0;
    const distance = parseFloat(propertyRaw.estimated_distance_km) || 0;
    
    // TRANSPORTATION LOGIC (3 MODES)
    let transportCost = 0;
    if (profile.transportMode === "Car") {
        transportCost = Math.round(distance * 0.65 * 2 * 22 + 70); // Fuel + Toll + Parking
    } else if (profile.transportMode === "Public Transport") {
        transportCost = Math.round(Math.min(11, distance * 0.45 + 2) * 22); // My50 logic
    } else {
        transportCost = 20; // Walking/Minimal
    }

    // COST OF LIVING (COL) = RENT + TRANSPORT + FIXED COMMITMENTS
    const totalLivingCost = rent + transportCost + profile.commitments;
    const balance = profile.salary - totalLivingCost;
    const deposit1plus1 = rent * 2; 

    // Z-AI SYSTEM ANALYSIS LOGIC
    let aiStatus = "PASSED";
    let aiComment = "";

    if (balance < 500) {
        aiStatus = "RISK";
        aiComment = "Z.AI: Risk! High cost of living detected. This will strain your monthly savings.";
    } else if (deposit1plus1 > profile.depositBudget) {
        aiStatus = "CAUTION";
        aiComment = `Z.AI: Deposit Gap! You need RM ${deposit1plus1 - profile.depositBudget} extra for the upfront 1+1.`;
    } else {
        aiStatus = "PASSED";
        aiComment = isChatUpdate ? "Z.AI: Values re-processed. Calculations updated via system command." : "Z.AI: Optimal match. Strong financial buffer for your lifestyle.";
    }

    return {
        ...propertyRaw,
        monthly_rent: rent,
        estimated_distance_km: distance,
        transportCost,
        totalLivingCost,
        disposableIncome: Math.max(0, balance),
        depositRequired: deposit1plus1,
        status: aiStatus,
        zAiAnalysis: aiComment,
        adIndex: propertyRaw.adIndex
    };
}

// 3. MAIN API CALL: RUN ANALYSIS (FETCHING DATA)
window.runSmartAnalysis = async function () {
    // SYNC LATEST PROFILE FROM INPUTS
    userProfile = {
        salary: parseFloat(document.getElementById("salary").value) || 0,
        commitments: parseFloat(document.getElementById("commitments").value) || 0,
        depositBudget: parseFloat(document.getElementById("deposit_budget").value) || 0,
        workplace: document.getElementById("workplace").value.trim().toUpperCase() || "TRX",
        transportMode: document.getElementById("transport_mode").value
    };

    const adInputs = Array.from(document.querySelectorAll(".ad-input"))
        .map(inp => inp.value.trim()).filter(v => v !== "");

    if (!userProfile.salary || adInputs.length === 0) {
        alert("Please enter Monthly Salary and add at least 1 Rental Ad.");
        return;
    }

    document.getElementById("loadingOverlay").style.display = "flex";

    try {
        const res = await fetch(GOOGLE_PROXY_URL, {
            method: "POST",
            body: JSON.stringify({
                model: "ilmu-glm-5.1",
                messages: [
                    { role: "system", content: "Return ONLY JSON array: [{\"area_name\":\"string\",\"monthly_rent\":number,\"estimated_distance_km\":number}]" },
                    { role: "user", content: `Workplace: ${userProfile.workplace}. Ads: ${adInputs.join(" | ")}` }
                ]
            })
        });

        const data = await res.json();
        const jsonMatch = data.choices[0].message.content.match(/\[.*\]/s);
        const parsedData = JSON.parse(jsonMatch[0]);

        // STORE IN GLOBAL MEMORY
        currentRankedAds = parsedData.map((prop, idx) => {
            return evaluateRentalOption({ ...prop, adIndex: idx + 1 }, userProfile);
        });

        currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);
        
        renderResultsUI(currentRankedAds);
        document.getElementById("loadingOverlay").style.display = "none";
        document.getElementById("resultOverlay").style.display = "flex";
        document.body.style.overflow = "hidden"; // Fix scroll to overlay

    } catch (err) {
        document.getElementById("loadingOverlay").style.display = "none";
        console.error(err);
        alert("AI Engine Error. Check proxy settings.");
    }
};

// 4. THE Z-AI CHAT ENGINE (CALCULATOR LOGIC)
window.processChatCommand = function () {
    const inputField = document.getElementById("chatCommand");
    const cmd = inputField.value.trim().toLowerCase();
    if (!cmd) return;

    let updated = false;
    let feedback = "";

    // SYSTEM REGEX: AD [ID] RENT [VALUE]
    const rentRegex = /ad\s*(\d+).*?(?:rent|rm|is|sewa)\s*(\d+)/;
    const salaryRegex = /(?:salary|gaji)\s*(\d+)/;

    const rentMatch = cmd.match(rentRegex);
    const salaryMatch = cmd.match(salaryRegex);

    if (rentMatch) {
        const adId = parseInt(rentMatch[1]);
        const newVal = parseFloat(rentMatch[2]);
        const target = currentRankedAds.find(a => a.adIndex === adId);
        if (target) {
            target.monthly_rent = newVal;
            updated = true;
            feedback = `AD ${adId} rent updated to RM ${newVal}`;
        }
    } else if (salaryMatch) {
        userProfile.salary = parseFloat(salaryMatch[1]);
        updated = true;
        feedback = `Salary updated to RM ${userProfile.salary}`;
    }

    if (updated) {
        // RE-CALCULATE AND RE-SORT
        currentRankedAds = currentRankedAds.map(ad => evaluateRentalOption(ad, userProfile, true));
        currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);
        renderResultsUI(currentRankedAds);
        typeAssistantMessage(`Success: ${feedback}`);
    } else {
        typeAssistantMessage("Try: 'AD 1 rent 1000'");
    }

    inputField.value = "";
};

// 5. THE RENDERER (UI IN OVERLAY)
function renderResultsUI(ranked) {
    const container = document.getElementById("resultsContainer");
    
    // Header Summary
    const summaryHeader = `
        <div class="mb-5 bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl border-b-4 border-blue-600">
            <div class="flex justify-between items-center mb-4">
                <div><p class="text-[9px] text-blue-400 font-black">WORKPLACE</p><p class="text-2xl font-black">${userProfile.workplace}</p></div>
                <div class="text-right"><p class="text-[9px] text-slate-500 font-black">SALARY</p><p class="text-2xl font-black text-emerald-400">RM ${userProfile.salary}</p></div>
            </div>
            <div class="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-800 pt-3 text-center">
                <span>Commits: RM ${userProfile.commitments}</span>
                <span>Depo: RM ${userProfile.depositBudget}</span>
                <span>${userProfile.transportMode}</span>
            </div>
        </div>
    `;

    // Cards Listing
    const cards = `<div class="pb-64 space-y-4">` + ranked.map((item, idx) => `
        <div class="p-6 bg-white border-2 ${idx === 0 ? 'border-emerald-500 shadow-lg scale-[1.01]' : 'border-slate-50'} rounded-[2rem] transition-all">
            <div class="flex justify-between mb-3 text-[9px] font-black uppercase">
                <span class="text-blue-600">RANK #${idx + 1} · AD ${item.adIndex}</span>
                <span class="${item.status === 'PASSED' ? 'text-green-600' : 'text-red-600'} bg-slate-50 px-3 py-1 rounded-full">${item.status}</span>
            </div>
            
            <h3 class="font-black text-2xl text-slate-800 leading-none mb-1">${item.area_name}</h3>
            <p class="text-[10px] font-bold text-slate-400 mb-4 italic">📍 ${item.estimated_distance_km}km from workplace</p>

            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 shadow-inner">
                <p class="text-[8px] font-black text-slate-400 uppercase mb-2 underline tracking-widest">Cost of Living (COL)</p>
                <div class="text-[10px] font-bold text-slate-600 space-y-1">
                    <div class="flex justify-between"><span class="text-blue-700 font-black">Monthly Rent:</span><span class="text-blue-700 font-black">RM ${item.monthly_rent}</span></div>
                    <div class="flex justify-between"><span>Transportation:</span><span>RM ${item.transportCost}</span></div>
                    <div class="flex justify-between border-b pb-1"><span>Fixed Commits:</span><span>RM ${userProfile.commitments}</span></div>
                    <div class="flex justify-between pt-1 text-slate-900 font-black uppercase"><span>Total Monthly Cost:</span><span>RM ${item.totalLivingCost}</span></div>
                </div>
            </div>

            <div class="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl mb-4 text-[11px] font-bold text-blue-900 leading-snug">
                ${item.zAiAnalysis}
            </div>

            <div class="bg-blue-600 p-5 rounded-[1.8rem] text-white flex justify-between items-center shadow-lg">
                <span class="text-[10px] font-black uppercase tracking-widest">Net Disposable Balance</span>
                <span class="text-3xl font-black">RM ${item.disposableIncome.toFixed(0)}</span>
            </div>
        </div>
    `).join('') + `</div>`;

    // THE FLOATING CHATBOX IN OVERLAY
    const chatUI = `
        <div class="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 rounded-t-[2.5rem] shadow-2xl z-50">
            <div id="aiMessageBox" class="max-h-20 overflow-y-auto mb-3 flex flex-col-reverse px-2"></div>
            <div class="flex items-center gap-2 bg-slate-100 p-2 rounded-full border border-slate-200">
                <input id="chatCommand" type="text" class="flex-1 bg-transparent border-none outline-none px-4 text-sm font-bold text-slate-700" placeholder="Try: AD 1 rent 800...">
                <button onclick="processChatCommand()" class="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-xl shadow-lg transition-transform active:scale-95">=</button>
            </div>
        </div>
    `;

    container.innerHTML = summaryHeader + cards + chatUI;
    container.style.overflowY = "auto";
    container.style.maxHeight = "90vh";
}

// 6. HELPER FUNCTIONS
function typeAssistantMessage(msg) {
    const msgBox = document.getElementById("aiMessageBox");
    const d = document.createElement("div");
    d.className = "bg-slate-800 text-white text-[10px] font-black p-2 px-4 rounded-full mb-1 self-start shadow-md animate-slideUp";
    d.innerText = `Z.AI: ${msg}`;
    msgBox.prepend(d);
}

window.closeResults = () => { 
    document.getElementById("resultOverlay").style.display = "none"; 
    document.body.style.overflow = "auto"; 
};

window.resetFullForm = () => { location.reload(); };

// Listen for Enter Key
document.addEventListener('keypress', (e) => { 
    if (e.key === 'Enter' && document.activeElement.id === 'chatCommand') processChatCommand(); 
});