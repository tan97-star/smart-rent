/**
 * SMARTRENT AI | VERSION 7.5.0 (CALCULATOR MODE)
 * FEATURE: Chat as a Live Calculator (= Button)
 */

let adCounter = 1;
let currentRankedAds = [];
let userProfile = {};
const GOOGLE_PROXY_URL = "https://script.google.com/macros/s/AKfycbyTlrixa43Psv9xyybmKi7qkF4dyJRavltMmMkzfXwSF3hQqAoGhW-WQuPvzynUDRDVEQ/exec";

// 1. DYNAMIC UI: ADD RENTAL AD
window.addRentalAd = function () {
    if (adCounter >= 5) return alert("Limit 5 ads for precision.");
    adCounter++;
    const container = document.getElementById("ads-dynamic-list");
    const newDiv = document.createElement("div");
    newDiv.className = "ad-entry animate-fadeIn flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-2 shadow-sm";
    newDiv.innerHTML = `
        <span class="text-[12px] font-black text-slate-400 w-8">#0${adCounter}</span>
        <input class="ad-input flex-1 border-none bg-transparent outline-none text-sm font-bold text-slate-700" placeholder="Paste details here...">
        <button onclick="this.parentElement.remove(); adCounter--;" class="text-red-400 hover:text-red-600 font-bold">✕</button>
    `;
    container.appendChild(newDiv);
};

// 2. CORE EVALUATION ENGINE
function evaluateRentalOption(propertyRaw, profile, isChatUpdate = false) {
    const rent = parseFloat(propertyRaw.monthly_rent) || 0;
    const distance = parseFloat(propertyRaw.estimated_distance_km) || 0;
    
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

    let aiStatus = "PASSED";
    let aiComment = "";

    if (balance < 500) {
        aiStatus = "RISK";
        aiComment = "Z.AI: Risk Alert! Balance is too low for sustainability.";
    } else if (deposit1plus1 > profile.depositBudget) {
        aiStatus = "CAUTION";
        aiComment = `Z.AI: Budget Gap! You need RM ${deposit1plus1 - profile.depositBudget} extra for deposit.`;
    } else {
        aiStatus = "PASSED";
        aiComment = isChatUpdate ? "Z.AI: Recalculated! This adjusted value improves your ranking." : "Z.AI: Optimal match. Strong financial buffer detected.";
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

// 3. INITIAL RUN (FETCH FROM AI)
window.runSmartAnalysis = async function () {
    userProfile = {
        salary: parseFloat(document.getElementById("salary").value) || 0,
        commitments: parseFloat(document.getElementById("commitments").value) || 0,
        depositBudget: parseFloat(document.getElementById("deposit_budget").value) || 0,
        workplace: document.getElementById("workplace").value.trim().toUpperCase() || "KL",
        transportMode: document.getElementById("transport_mode").value
    };

    const adInputs = Array.from(document.querySelectorAll(".ad-input")).map(inp => inp.value.trim()).filter(v => v !== "");
    if (!userProfile.salary || adInputs.length === 0) return alert("Fill salary and ads first!");

    document.getElementById("loadingOverlay").style.display = "flex";

    try {
        const res = await fetch(GOOGLE_PROXY_URL, {
            method: "POST",
            body: JSON.stringify({
                model: "ilmu-glm-5.1",
                messages: [{ role: "system", content: "JSON only: [{\"area_name\":\"string\",\"monthly_rent\":number,\"estimated_distance_km\":number}]" },
                           { role: "user", content: `Work: ${userProfile.workplace}. Ads: ${adInputs.join(" | ")}` }]
            })
        });

        const data = await res.json();
        const parsedData = JSON.parse(data.choices[0].message.content.match(/\[.*\]/s)[0]);

        currentRankedAds = parsedData.map((prop, idx) => evaluateRentalOption({ ...prop, adIndex: idx + 1 }, userProfile));
        currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);

        renderResultsUI(currentRankedAds);
        document.getElementById("loadingOverlay").style.display = "none";
        document.getElementById("resultOverlay").style.display = "flex";
        document.getElementById("aiMessageBox").innerHTML = ""; // Reset chat history
    } catch (err) {
        document.getElementById("loadingOverlay").style.display = "none";
        alert("AI Engine error. Check proxy.");
    }
};

// 4. CHAT AS CALCULATOR (= BUTTON LOGIC)
window.processChatCommand = function () {
    const inputField = document.getElementById("chatCommand");
    const cmd = inputField.value.trim().toLowerCase();
    if (!cmd) return;

    let updated = false;
    let msg = "";

    // Regex for: AD 1 rent 800, salary 6000, depo 1000
    const rentMatch = cmd.match(/ad\s*(\d+)\s*(?:rent|price|is|=|rm)?\s*(\d+)/);
    const salaryMatch = cmd.match(/(?:salary|gaji)\s*(?:is|=|to)?\s*(\d+)/);
    const depoMatch = cmd.match(/(?:depo|deposit)\s*(?:budget|is|=|to)?\s*(\d+)/);

    if (rentMatch) {
        const adId = parseInt(rentMatch[1]);
        const idx = currentRankedAds.findIndex(p => p.adIndex === adId);
        if (idx !== -1) {
            currentRankedAds[idx].monthly_rent = parseFloat(rentMatch[2]);
            updated = true;
            msg = `AD ${adId} rent set to RM ${currentRankedAds[idx].monthly_rent}`;
        }
    } else if (salaryMatch) {
        userProfile.salary = parseFloat(salaryMatch[1]);
        updated = true;
        msg = `Net salary recalculated at RM ${userProfile.salary}`;
    } else if (depoMatch) {
        userProfile.depositBudget = parseFloat(depoMatch[1]);
        updated = true;
        msg = `Deposit budget adjusted to RM ${userProfile.depositBudget}`;
    }

    if (updated) {
        // RE-CALCULATE ALL INSTANTLY
        currentRankedAds = currentRankedAds.map(ad => evaluateRentalOption(ad, userProfile, true));
        currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);
        renderResultsUI(currentRankedAds);
        typeAssistantMessage(`📊 ${msg}`);
    } else {
        typeAssistantMessage("⚠️ Try: 'AD 1 rent 900' or 'Salary 6000'");
    }
    inputField.value = "";
};

// 5. PREMIUM RENDERER (WITH SCROLL & HIGHLIGHTS)
function renderResultsUI(ranked) {
    const container = document.getElementById("resultsContainer");
    
    const header = `
        <div class="mb-8 bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl border-b-8 border-blue-600">
            <div class="flex justify-between items-end mb-6 border-b border-slate-800 pb-6">
                <div><p class="text-[10px] text-blue-500 font-black uppercase mb-1">Workplace</p><p class="text-4xl font-black">${userProfile.workplace}</p></div>
                <div class="text-right"><p class="text-[10px] text-slate-500 font-black uppercase mb-1">Salary</p><p class="text-3xl font-black text-emerald-400">RM ${userProfile.salary}</p></div>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div class="bg-slate-800/50 p-3 rounded-2xl text-center"><p class="text-[8px] text-slate-500 uppercase">Commits</p><p class="text-xs font-black">RM ${userProfile.commitments}</p></div>
                <div class="bg-slate-800/50 p-3 rounded-2xl text-center"><p class="text-[8px] text-slate-500 uppercase">Depo Budget</p><p class="text-xs font-black">RM ${userProfile.depositBudget}</p></div>
                <div class="bg-slate-800/50 p-3 rounded-2xl text-center"><p class="text-[8px] text-slate-500 uppercase">Transport</p><p class="text-xs font-black uppercase">${userProfile.transportMode}</p></div>
            </div>
        </div>
    `;

    const cards = `<div class="pb-48 space-y-6">` + ranked.map((item, idx) => `
        <div class="result-card p-8 bg-white border-2 ${idx === 0 ? 'border-emerald-500 shadow-2xl scale-[1.02]' : 'border-slate-100'} rounded-[3rem]">
            <div class="flex justify-between items-start mb-6">
                <span class="bg-blue-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase">RANK #${idx + 1} · AD ${item.adIndex}</span>
                <span class="${item.status === 'PASSED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} font-black px-4 py-1.5 rounded-full text-[10px] uppercase">${item.status}</span>
            </div>
            <h3 class="font-black text-4xl text-slate-800 leading-none mb-1">${item.area_name}</h3>
            <p class="text-sm font-bold text-slate-400 mb-6 italic">📍 ${item.estimated_distance_km}km distance</p>

            <div class="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 mb-6">
                <p class="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Normal Depo (1+1)</p>
                <div class="flex justify-between items-center text-xl font-black text-slate-800">
                    <span class="text-sm font-bold text-slate-400">RM ${item.monthly_rent} x 2 =</span>
                    <span class="${item.depositRequired > userProfile.depositBudget ? 'text-red-600' : ''}">RM ${item.depositRequired}</span>
                </div>
            </div>

            <div class="mb-6 p-5 bg-blue-50 border-l-8 border-blue-500 rounded-r-[2rem]">
                <p class="text-[13px] font-bold text-blue-900 leading-snug">${item.zAiAnalysis}</p>
            </div>

            <div class="grid grid-cols-2 gap-4 pt-4 border-t border-dashed">
                <div class="bg-slate-100 p-5 rounded-[2rem]">
                    <p class="text-[9px] font-black text-slate-500 uppercase">Monthly Rent</p>
                    <p class="text-2xl font-black text-slate-800">RM ${item.monthly_rent}</p>
                </div>
                <div class="bg-blue-600 p-5 rounded-[2.5rem] text-white shadow-xl">
                    <p class="text-[9px] font-black text-blue-200 uppercase tracking-widest">Disposable</p>
                    <p class="text-3xl font-black">RM ${item.disposableIncome.toFixed(0)}</p>
                </div>
            </div>
        </div>
    `).join('') + `</div>`;

    container.innerHTML = header + cards;
    container.style.overflowY = "auto";
    container.style.maxHeight = "85vh";
}

function typeAssistantMessage(msg) {
    const msgBox = document.getElementById("aiMessageBox");
    const d = document.createElement("div");
    d.className = "bg-slate-800 text-white text-[12px] font-bold p-4 rounded-3xl mb-2 shadow-xl animate-slideUp border-l-4 border-blue-500";
    d.innerText = msg;
    msgBox.prepend(d);
}

window.closeResults = () => { document.getElementById("resultOverlay").style.display = "none"; document.body.style.overflow = "auto"; };
window.resetFullForm = () => location.reload();
document.addEventListener('keypress', (e) => { if (e.key === 'Enter' && document.activeElement.id === 'chatCommand') processChatCommand(); });
