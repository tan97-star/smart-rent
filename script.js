/**
 * SMARTRENT AI | VERSION 5.5.0 (PREMIUM UI & SYNC)
 * IMPROVEMENTS: Header Scaling, High-Contrast Fonts, & Chat-Sync Logic
 */

let adCounter = 1;
let currentRankedAds = [];
let userProfile = {};
const GOOGLE_PROXY_URL = "https://script.google.com/macros/s/AKfycbyTlrixa43Psv9xyybmKi7qkF4dyJRavltMmMkzfXwSF3hQqAoGhW-WQuPvzynUDRDVEQ/exec";

// 1. DYNAMIC UI: ADD AD
window.addRentalAd = function () {
    if (adCounter >= 5) return alert("Limit 5 ads.");
    adCounter++;
    const container = document.getElementById("ads-dynamic-list");
    const div = document.createElement("div");
    div.className = "ad-entry animate-fadeIn flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-2 shadow-sm";
    div.innerHTML = `
        <span class="text-[12px] font-black text-slate-400">#0${adCounter}</span>
        <input class="ad-input flex-1 border-none bg-transparent outline-none text-sm font-bold text-slate-700" placeholder="Paste details here...">
        <button onclick="this.parentElement.remove(); adCounter--;" class="text-red-400 hover:text-red-600 font-bold">✕</button>
    `;
    container.appendChild(div);
};

// 2. CORE EVALUATION ENGINE
function evaluateRentalOption(propertyRaw, profile, isChatUpdate = false) {
    const rent = parseFloat(propertyRaw.monthly_rent) || 0;
    const distance = parseFloat(propertyRaw.estimated_distance_km) || 0;
    
    // Transport Calculation Logic
    let transportCost = 0;
    if (profile.transportMode === "Car") {
        transportCost = Math.round(distance * 0.65 * 2 * 22 + 70); 
    } else if (profile.transportMode === "Public Transport") {
        transportCost = Math.round(Math.min(11, distance * 0.45 + 2) * 22);
    } else {
        transportCost = 20; 
    }

    const totalMonthlyCost = rent + transportCost + profile.commitments;
    const balance = profile.salary - totalMonthlyCost;
    const deposit1plus1 = rent * 2;

    // Z-AI SYSTEM ANALYSIS
    let aiStatus = "PASSED";
    let aiComment = "";

    if (balance < 500) {
        aiStatus = "RISK";
        aiComment = "Z.AI: Critical financial risk. Disposable income is too low for sustainability.";
    } else if (deposit1plus1 > profile.depositBudget) {
        aiStatus = "CAUTION";
        aiComment = `Z.AI: Deposit barrier! You're RM ${deposit1plus1 - profile.depositBudget} short for the 1+1 upfront.`;
    } else {
        aiStatus = "PASSED";
        aiComment = isChatUpdate ? "Z.AI: Negotiated price accepted! This is now a top-tier sustainable choice." : "Z.AI: Optimal match for your profile and location.";
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

// 3. RUN ANALYSIS
window.runSmartAnalysis = async function () {
    userProfile = {
        salary: parseFloat(document.getElementById("salary").value) || 0,
        commitments: parseFloat(document.getElementById("commitments").value) || 0,
        depositBudget: parseFloat(document.getElementById("deposit_budget").value) || 0,
        workplace: document.getElementById("workplace").value.trim() || "TRX",
        transportMode: document.getElementById("transport_mode").value
    };

    const inputs = Array.from(document.querySelectorAll(".ad-input")).map(i => i.value).filter(v => v);
    if (!userProfile.salary || inputs.length === 0) return alert("Fill form first.");

    document.getElementById("loadingOverlay").style.display = "flex";

    try {
        const res = await fetch(GOOGLE_PROXY_URL, {
            method: "POST",
            body: JSON.stringify({
                model: "ilmu-glm-5.1",
                messages: [
                    { role: "system", content: "Extract JSON array: [{\"area_name\":\"string\",\"monthly_rent\":number,\"estimated_distance_km\":number}]" },
                    { role: "user", content: `Work: ${userProfile.workplace}. Ads: ${inputs.join(" | ")}` }
                ]
            })
        });

        const data = await res.json();
        const jsonMatch = data.choices[0].message.content.match(/\[.*\]/s);
        const parsed = JSON.parse(jsonMatch[0]);

        currentRankedAds = parsed.map((item, idx) => evaluateRentalOption({...item, adIndex: idx + 1}, userProfile));
        currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);

        renderResultsUI(currentRankedAds);
        document.getElementById("loadingOverlay").style.display = "none";
        document.getElementById("resultOverlay").style.display = "flex";
        document.getElementById("aiMessageBox").innerHTML = "";

    } catch (err) {
        document.getElementById("loadingOverlay").style.display = "none";
        alert("AI connection issue. Retry.");
    }
};

// 4. IMPROVED RENDERER (HEADER & FONT SIZING)
function renderResultsUI(ranked) {
    const container = document.getElementById("resultsContainer");
    
    // PREMIUM HEADER IMPROVISATION
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
                    <p class="text-sm font-black text-slate-200">${userProfile.transportMode}</p>
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
                <p class="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Initial 1+1 Deposit</p>
                <div class="flex justify-between items-center">
                    <span class="text-sm font-bold text-slate-600">RM ${item.monthly_rent} + RM ${item.monthly_rent} =</span>
                    <span class="text-xl font-black ${item.depositRequired > userProfile.depositBudget ? 'text-red-600' : 'text-slate-800'}">RM ${item.depositRequired}</span>
                </div>
            </div>

            <div class="mb-6 p-5 bg-blue-50 border-l-8 border-blue-500 rounded-r-[2rem]">
                <p class="text-xs font-black text-blue-700 leading-relaxed uppercase mb-1">Z.AI Analysis</p>
                <p class="text-[13px] font-bold text-blue-900 leading-snug">${item.zAiAnalysis}</p>
            </div>

            <div class="space-y-3 border-t-2 border-dashed border-slate-100 pt-6">
                <div class="flex justify-between text-sm font-bold text-slate-500">
                    <span>Rent + Transport</span>
                    <span>RM ${item.monthly_rent} + RM ${item.transportCost}</span>
                </div>
                <div class="flex justify-between items-center mt-4 bg-blue-600 p-6 rounded-[2.2rem] text-white shadow-xl">
                    <span class="text-[10px] font-black uppercase tracking-widest">Monthly Balance</span>
                    <span class="text-3xl font-black">RM ${item.disposableIncome.toFixed(0)}</span>
                </div>
            </div>
        </div>
    `).join('') + `</div>`;

    container.innerHTML = summaryHeader + cards;
}

// 5. CHAT SYNC ENGINE
window.processChatCommand = function () {
    const input = document.getElementById("chatCommand");
    const cmd = input.value.trim().toLowerCase();
    const match = cmd.match(/ad\s*(\d+)\s*(?:rent|price|is|=|rm)?\s*(\d+)/);
    
    if (match) {
        const adId = parseInt(match[1]);
        const newRent = parseFloat(match[2]);
        const idx = currentRankedAds.findIndex(p => p.adIndex === adId);
        
        if (idx !== -1) {
            currentRankedAds[idx].monthly_rent = newRent;
            // UPDATE WITH CHAT SYNC FLAG
            Object.assign(currentRankedAds[idx], evaluateRentalOption(currentRankedAds[idx], userProfile, true));
            currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);
            renderResultsUI(currentRankedAds);
            typeAssistantMessage(`AD ${adId} updated to RM ${newRent}. Z.AI has updated the risk profile.`);
        }
    }
    input.value = "";
};

function typeAssistantMessage(msg) {
    const msgBox = document.getElementById("aiMessageBox");
    const d = document.createElement("div");
    d.className = "bg-blue-800 text-white text-[11px] font-black p-4 rounded-3xl mb-2 shadow-lg animate-slideUp border-l-4 border-emerald-400";
    d.innerText = msg;
    msgBox.prepend(d);
}

window.closeResults = () => document.getElementById("resultOverlay").style.display = "none";
window.resetFullForm = () => location.reload();
document.addEventListener('keypress', (e) => { if (e.key === 'Enter' && document.activeElement.id === 'chatCommand') processChatCommand(); });
