/**
 * SMARTRENT AI | VERSION 6.5.0 (ULTIMATE FULL RELEASE)
 * FULL FEATURES: 3-Mode Transport, 1+1 Deposit, Live Z-AI Chat Adjustment
 */

let adCounter = 1;
let currentRankedAds = [];
let userProfile = {};
const GOOGLE_PROXY_URL = "https://script.google.com/macros/s/AKfycbyTlrixa43Psv9xyybmKi7qkF4dyJRavltMmMkzfXwSF3hQqAoGhW-WQuPvzynUDRDVEQ/exec";

// 1. DYNAMIC UI: ADD RENTAL AD
window.addRentalAd = function () {
    if (adCounter >= 5) {
        alert("Maximum 5 rental ads for precise decision intelligence.");
        return;
    }
    adCounter++;
    const container = document.getElementById("ads-dynamic-list");
    const newDiv = document.createElement("div");
    newDiv.className = "ad-entry animate-fadeIn flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-2 shadow-sm";
    newDiv.innerHTML = `
        <span class="text-[12px] font-black text-slate-400 w-8">#0${adCounter}</span>
        <input class="ad-input flex-1 border-none bg-transparent outline-none text-sm font-bold text-slate-700" placeholder="Paste property link or details...">
        <button onclick="this.parentElement.remove(); adCounter--;" class="text-red-400 hover:text-red-600 font-bold w-6 h-6 rounded-full bg-white shadow-sm transition-all">✕</button>
    `;
    container.appendChild(newDiv);
};

// 2. FINANCIAL & SUSTAINABILITY ENGINE (3 TRANSPORT MODES)
function evaluateRentalOption(propertyRaw, profile, isChatUpdate = false) {
    const rent = parseFloat(propertyRaw.monthly_rent) || 0;
    const distance = parseFloat(propertyRaw.estimated_distance_km) || 0;
    
    // TRANSPORTATION LOGIC (3 CONDITIONS)
    let transportCost = 0;
    if (profile.transportMode === "Car") {
        transportCost = Math.round(distance * 0.65 * 2 * 22 + 70); // Fuel + Toll + Parking
    } else if (profile.transportMode === "Public Transport") {
        transportCost = Math.round(Math.min(11, distance * 0.45 + 2) * 22); // My50/LRT logic
    } else if (profile.transportMode === "Walk") {
        transportCost = 20; // Maintenance (Shoes/Umbrella)
    }

    const totalMonthlyCost = rent + transportCost + profile.commitments;
    const balance = profile.salary - totalMonthlyCost;
    const deposit1plus1 = rent * 2; // NORMAL DEPO 1+1 LOGIC

    // Z-AI SYSTEM ANALYSIS
    let aiStatus = "PASSED";
    let aiComment = "";

    if (balance < 500) {
        aiStatus = "RISK";
        aiComment = "Z.AI: Critical financial risk. Your disposable income is below the safety buffer.";
    } else if (deposit1plus1 > profile.depositBudget) {
        aiStatus = "CAUTION";
        aiComment = `Z.AI: Deposit barrier detected. You need RM ${deposit1plus1 - profile.depositBudget} more for the upfront 1+1 payment.`;
    } else if (rent > (profile.salary * 0.35)) {
        aiStatus = "CAUTION";
        aiComment = "Z.AI: Rent exceeds 35% of income. Sustainable, but watch your savings.";
    } else {
        aiStatus = "PASSED";
        aiComment = isChatUpdate ? "Z.AI: Value adjusted! This option is now highly optimized for your profile." : "Z.AI: Optimal match. Strong financial buffer for your lifestyle.";
    }

    return {
        ...propertyRaw,
        monthly_rent: rent,
        estimated_distance_km: distance,
        transportCost,
        totalLivingCost: totalMonthlyCost,
        disposableIncome: Math.max(0, balance),
        depositRequired: deposit1plus1,
        status: aiStatus,
        zAiAnalysis: aiComment,
        adIndex: propertyRaw.adIndex
    };
}

// 3. MAIN ANALYSIS VIA GOOGLE PROXY
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
                    { role: "system", content: "Extract rental data. Return ONLY valid JSON array. Format: [{\"area_name\":\"string\",\"monthly_rent\":number,\"estimated_distance_km\":number}]" },
                    { role: "user", content: `Workplace: ${userProfile.workplace}. Ads: ${adInputs.join(" | ")}` }
                ]
            })
        });

        const data = await res.json();
        const jsonMatch = data.choices[0].message.content.match(/\[.*\]/s);
        const parsedData = JSON.parse(jsonMatch[0]);

        currentRankedAds = parsedData.map((prop, idx) => {
            return evaluateRentalOption({ ...prop, adIndex: idx + 1 }, userProfile);
        });

        currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);
        
        renderResultsUI(currentRankedAds);
        document.getElementById("loadingOverlay").style.display = "none";
        document.getElementById("resultOverlay").style.display = "flex";
        document.getElementById("aiMessageBox").innerHTML = ""; // Clear old chat

    } catch (err) {
        document.getElementById("loadingOverlay").style.display = "none";
        console.error(err);
        alert("AI Engine busy. Please try again.");
    }
};

// 4. Z-AI CONVERSATIONAL ENGINE (ADJUST VALUES LIVE)
window.processChatCommand = function () {
    const inputField = document.getElementById("chatCommand");
    const cmd = inputField.value.trim().toLowerCase();
    if (!cmd) return;

    let updatedAny = false;
    let feedbackMsg = "";

    // A. ADJUST RENT (e.g. "ad 1 rent 800")
    const rentMatch = cmd.match(/ad\s*(\d+)\s*(?:rent|price|is|=|rm)?\s*(\d+)/);
    if (rentMatch) {
        const adId = parseInt(rentMatch[1]);
        const newRent = parseFloat(rentMatch[2]);
        const idx = currentRankedAds.findIndex(p => p.adIndex === adId);
        if (idx !== -1) {
            currentRankedAds[idx].monthly_rent = newRent;
            updatedAny = true;
            feedbackMsg = `AD ${adId} rent adjusted to RM ${newRent}.`;
        }
    }

    // B. ADJUST SALARY (e.g. "salary 6000")
    const salaryMatch = cmd.match(/(?:salary|gaji)\s*(?:is|=|to)?\s*(\d+)/);
    if (salaryMatch) {
        userProfile.salary = parseFloat(salaryMatch[1]);
        updatedAny = true;
        feedbackMsg = `Profile updated: Net salary is now RM ${userProfile.salary}.`;
    }

    // C. ADJUST DEPOSIT BUDGET (e.g. "depo budget 1000")
    const depoMatch = cmd.match(/(?:depo|deposit)\s*(?:budget|is|=|to)?\s*(\d+)/);
    if (depoMatch) {
        userProfile.depositBudget = parseFloat(depoMatch[1]);
        updatedAny = true;
        feedbackMsg = `Deposit budget adjusted to RM ${userProfile.depositBudget}.`;
    }

    if (updatedAny) {
        // Recalculate all with new values
        currentRankedAds = currentRankedAds.map(ad => evaluateRentalOption(ad, userProfile, true));
        currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);
        renderResultsUI(currentRankedAds);
        typeAssistantMessage(`✅ ${feedbackMsg}`);
    } else {
        typeAssistantMessage("⚠️ Try: 'AD 1 rent 900' or 'Salary 6000'");
    }

    inputField.value = "";
};

// 5. PREMIUM UI RENDERER
function renderResultsUI(ranked) {
    const container = document.getElementById("resultsContainer");
    
    // PREMIUM HEADER
    const summaryHeader = `
        <div class="mb-8 bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl border-b-8 border-blue-600">
            <div class="flex justify-between items-end mb-6 border-b border-slate-800 pb-6">
                <div>
                    <p class="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Target Workplace</p>
                    <p class="text-4xl font-black tracking-tighter text-white">${userProfile.workplace}</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Monthly Salary</p>
                    <p class="text-3xl font-black text-emerald-400">RM ${userProfile.salary}</p>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div class="bg-slate-800/50 p-4 rounded-2xl">
                    <p class="text-[9px] font-bold text-slate-500 uppercase mb-1">Fixed Commits</p>
                    <p class="text-sm font-black text-slate-200">RM ${userProfile.commitments}</p>
                </div>
                <div class="bg-slate-800/50 p-4 rounded-2xl">
                    <p class="text-[9px] font-bold text-slate-500 uppercase mb-1">Depo Budget</p>
                    <p class="text-sm font-black text-slate-200">RM ${userProfile.depositBudget}</p>
                </div>
                <div class="bg-slate-800/50 p-4 rounded-2xl">
                    <p class="text-[9px] font-bold text-slate-500 uppercase mb-1">Transport</p>
                    <p class="text-sm font-black text-slate-200 uppercase">${userProfile.transportMode}</p>
                </div>
            </div>
        </div>
    `;

    const cards = `<div class="grid-ranking space-y-6">` + ranked.map((item, idx) => `
        <div class="result-card p-8 bg-white border-2 ${idx === 0 ? 'border-emerald-500 shadow-2xl scale-[1.02]' : 'border-slate-100'} rounded-[3rem] transition-all">
            <div class="flex justify-between items-start mb-6">
                <span class="bg-blue-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase">RANK #${idx + 1} · AD ${item.adIndex}</span>
                <span class="status-tag ${item.status === 'PASSED' ? 'bg-green-100 text-green-700' : (item.status === 'RISK' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')} font-black px-4 py-1.5 rounded-full text-[10px] shadow-sm">${item.status}</span>
            </div>
            
            <h3 class="font-black text-3xl text-slate-800 leading-none mb-2">${item.area_name}</h3>
            <p class="text-sm font-bold text-slate-400 mb-6 italic">📍 ${item.estimated_distance_km}km from workplace</p>

            <div class="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 mb-6">
                <p class="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest italic">Initial Cost (Normal Depo 1+1)</p>
                <div class="flex justify-between items-center">
                    <span class="text-sm font-bold text-slate-600">RM ${item.monthly_rent} + RM ${item.monthly_rent} =</span>
                    <span class="text-xl font-black ${item.depositRequired > userProfile.depositBudget ? 'text-red-600' : 'text-slate-800'}">RM ${item.depositRequired}</span>
                </div>
                ${item.depositRequired > userProfile.depositBudget ? `<p class="text-[9px] text-red-500 font-black mt-2 uppercase tracking-tighter">⚠️ Over Deposit Budget by RM ${item.depositRequired - userProfile.depositBudget}</p>` : ''}
            </div>

            <div class="mb-6 p-5 bg-blue-50 border-l-8 border-blue-500 rounded-r-[2rem]">
                <p class="text-xs font-black text-blue-700 leading-relaxed uppercase mb-1 tracking-wider">Z.AI Analysis</p>
                <p class="text-[13px] font-bold text-blue-900 leading-snug">${item.zAiAnalysis}</p>
            </div>

            <div class="space-y-3 border-t-2 border-dashed border-slate-100 pt-6">
                <div class="flex justify-between text-sm font-bold text-slate-500">
                    <span>Rent + Transport Cost</span>
                    <span>RM ${item.monthly_rent} + RM ${item.transportCost}</span>
                </div>
                <div class="flex justify-between items-center mt-4 bg-blue-600 p-6 rounded-[2.2rem] text-white shadow-xl">
                    <span class="text-[10px] font-black uppercase tracking-widest">Monthly Disposable Balance</span>
                    <span class="text-3xl font-black">RM ${item.disposableIncome.toFixed(0)}</span>
                </div>
            </div>
        </div>
    `).join('') + `</div>`;

    container.innerHTML = summaryHeader + cards;
}

// 6. UI ACTIONS & HELPERS
function typeAssistantMessage(msg) {
    const msgBox = document.getElementById("aiMessageBox");
    const d = document.createElement("div");
    d.className = "bg-slate-800 text-white text-[12px] font-bold p-4 rounded-3xl rounded-tl-none mb-3 shadow-xl animate-slideUp border-l-4 border-blue-400";
    d.innerHTML = `<span class="text-blue-400">Z.AI:</span> ${msg}`;
    msgBox.prepend(d);
}

window.closeResults = () => { document.getElementById("resultOverlay").style.display = "none"; };
window.resetFullForm = () => { if(confirm("Clear all data?")) location.reload(); };

document.addEventListener('keypress', (e) => { 
    if (e.key === 'Enter' && document.activeElement.id === 'chatCommand') processChatCommand(); 
});
