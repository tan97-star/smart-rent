/**
 * SMARTRENT AI | VERSION 4.0.0 (ULTIMATE)
 * COMPLETE RE-CALCULATION & UI SYNC
 */

let adCounter = 1;
let currentRankedAds = [];
let userProfile = {};
const GOOGLE_PROXY_URL = "https://script.google.com/macros/s/AKfycbyTlrixa43Psv9xyybmKi7qkF4dyJRavltMmMkzfXwSF3hQqAoGhW-WQuPvzynUDRDVEQ/exec";

// 1. DYNAMIC UI: ADD RENTAL AD
window.addRentalAd = function () {
    if (adCounter >= 5) return alert("Limit 5 ads for demo.");
    adCounter++;
    const container = document.getElementById("ads-dynamic-list");
    const div = document.createElement("div");
    div.className = "ad-entry animate-fadeIn flex items-center gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100 mb-2";
    div.innerHTML = `
        <span class="text-[10px] font-black text-slate-400 w-8">#0${adCounter}</span>
        <input class="ad-input flex-1 border-none bg-transparent outline-none text-sm font-medium" placeholder="Paste details here...">
        <button onclick="this.parentElement.remove(); adCounter--;" class="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
    `;
    container.appendChild(div);
};

// 2. CORE ENGINE: CALCULATE EVERYTHING
function evaluateRentalOption(propertyRaw, profile) {
    const rent = parseFloat(propertyRaw.monthly_rent) || 0;
    const distance = parseFloat(propertyRaw.estimated_distance_km) || 0;
    
    // Transport Calculation Logic
    let transportCost = 20; // Default Walk/Minimum
    if (profile.transportMode === "Car") {
        transportCost = Math.round(distance * 0.65 * 2 * 22 + 70); 
    } else if (profile.transportMode === "Public Transport") {
        transportCost = Math.round(Math.min(11, distance * 0.45 + 2) * 22);
    }

    const totalCost = rent + transportCost + profile.commitments;
    const balance = profile.salary - totalCost;
    const deposit = rent * 2;

    // Status Determination
    let status = "PASSED";
    let advice = "✅ Perfectly matches your budget.";
    
    if (balance < 550) {
        status = "RISK";
        advice = "❌ Extreme financial pressure.";
    } else if ((rent / profile.salary) > 0.35) {
        status = "CAUTION";
        advice = "⚠️ Rent > 35% of income.";
    } else if (deposit > profile.depositBudget) {
        status = "CAUTION";
        advice = "⚠️ Initial deposit exceeds budget.";
    }

    return {
        ...propertyRaw,
        monthly_rent: rent,
        estimated_distance_km: distance,
        transportCost,
        totalLivingCost: totalCost,
        disposableIncome: Math.max(0, balance),
        depositRequired: deposit,
        status,
        advice,
        adIndex: propertyRaw.adIndex
    };
}

// 3. MAIN ACTION: RUN ANALYSIS
window.runSmartAnalysis = async function () {
    // SYNC PROFILE DATA FROM INPUTS (ANTI-STALE DATA)
    userProfile = {
        salary: parseFloat(document.getElementById("salary").value) || 0,
        commitments: parseFloat(document.getElementById("commitments").value) || 0,
        depositBudget: parseFloat(document.getElementById("deposit_budget").value) || 0,
        workplace: document.getElementById("workplace").value.trim(),
        transportMode: document.getElementById("transport_mode").value
    };

    const inputs = Array.from(document.querySelectorAll(".ad-input")).map(i => i.value).filter(v => v);
    
    if (!userProfile.salary || !userProfile.workplace || inputs.length === 0) {
        return alert("Fill salary, workplace and at least 1 ad.");
    }

    document.getElementById("loadingOverlay").style.display = "flex";

    try {
        const res = await fetch(GOOGLE_PROXY_URL, {
            method: "POST",
            body: JSON.stringify({
                model: "ilmu-glm-5.1",
                messages: [
                    { role: "system", content: "Return JSON array: [{\"area_name\":\"string\",\"monthly_rent\":number,\"estimated_distance_km\":number}]" },
                    { role: "user", content: `Work: ${userProfile.workplace}. Ads: ${inputs.join(" | ")}` }
                ]
            })
        });

        const data = await res.json();
        const jsonMatch = data.choices[0].message.content.match(/\[.*\]/s);
        const parsed = JSON.parse(jsonMatch[0]);

        // RE-CALCULATE WITH LATEST DATA
        currentRankedAds = parsed.map((item, idx) => evaluateRentalOption({...item, adIndex: idx + 1}, userProfile));
        currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);

        renderResultsUI(currentRankedAds);
        
        document.getElementById("loadingOverlay").style.display = "none";
        document.getElementById("resultOverlay").style.display = "flex";
        
        // Clear Chat UI for new session
        document.getElementById("aiMessageBox").innerHTML = "";
        typeAssistantMessage("Z.AI Analysis Live: All rankings optimized for RM " + userProfile.salary + " salary.");

    } catch (err) {
        document.getElementById("loadingOverlay").style.display = "none";
        alert("AI Engine timed out. Try again.");
    }
};

// 4. CHAT COMMAND ENGINE
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
            // UPDATE & RE-SORT
            const updated = evaluateRentalOption(currentRankedAds[idx], userProfile);
            Object.assign(currentRankedAds[idx], updated);
            currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);
            
            renderResultsUI(currentRankedAds);
            typeAssistantMessage(`Updated AD ${adId} rent to RM ${newRent}.`);
        }
    }
    input.value = "";
};

// 5. THE RENDERER (SMART UI)
function renderResultsUI(ranked) {
    const container = document.getElementById("resultsContainer");
    
    const summaryHeader = `
        <div class="mb-6 bg-slate-800 text-white p-4 rounded-3xl flex justify-between items-center shadow-xl">
            <div>
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Base Salary</p>
                <p class="text-lg font-black">RM ${userProfile.salary}</p>
            </div>
            <div class="text-right">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Area</p>
                <p class="text-sm font-bold">${userProfile.workplace}</p>
            </div>
        </div>
    `;

    const cards = `<div class="grid-ranking space-y-4">` + ranked.map((item, idx) => `
        <div class="result-card p-6 bg-white border-2 ${idx === 0 ? 'border-emerald-500 shadow-emerald-100' : 'border-slate-100'} rounded-[2.5rem] shadow-xl transition-all">
            <div class="flex justify-between items-start mb-4">
                <span class="bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase">RANK #${idx + 1}</span>
                <span class="status-tag ${item.status === 'PASSED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} font-black px-3 py-1 rounded-full text-[9px]">${item.status}</span>
            </div>
            <h3 class="font-black text-xl text-slate-800 leading-tight mb-1">${item.area_name}</h3>
            <p class="text-xs font-bold text-slate-400 mb-5">📍 ${item.estimated_distance_km}km from workplace</p>
            
            <div class="space-y-3">
                <div class="flex justify-between text-sm">
                    <span class="font-bold text-slate-500">Rent</span>
                    <span class="font-black text-slate-800">RM ${item.monthly_rent}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="font-bold text-slate-500">Transport</span>
                    <span class="font-black text-slate-800">RM ${item.transportCost}</span>
                </div>
                <div class="border-t border-slate-100 pt-3 flex justify-between items-center">
                    <span class="text-[10px] font-black text-slate-400 uppercase">Disposable Buffer</span>
                    <span class="text-2xl font-black text-blue-600">RM ${item.disposableIncome.toFixed(0)}</span>
                </div>
                <div class="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] font-bold text-slate-600 leading-relaxed italic">
                    "${item.advice}"
                </div>
            </div>
        </div>
    `).join('') + `</div>`;

    container.innerHTML = summaryHeader + cards;
}

function typeAssistantMessage(msg) {
    const msgBox = document.getElementById("aiMessageBox");
    const bubble = document.createElement("div");
    bubble.className = "bg-blue-700 text-white text-[10px] font-bold p-3 rounded-2xl rounded-tl-none shadow-lg mb-2 animate-slideUp";
    bubble.innerText = msg;
    msgBox.prepend(bubble);
}

// 6. UI ACTIONS
window.closeResults = () => { document.getElementById("resultOverlay").style.display = "none"; };
window.resetFullForm = () => { if(confirm("Clear all data?")) location.reload(); };

// Key Bindings
document.addEventListener('keypress', (e) => { 
    if (e.key === 'Enter' && document.activeElement.id === 'chatCommand') processChatCommand(); 
});