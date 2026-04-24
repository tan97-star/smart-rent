/**
 * SMARTRENT AI | VERSION 4.3.0
 * FIX: Chat box update synchronization for 1+1 Deposit & Status
 */

let adCounter = 1;
let currentRankedAds = [];
let userProfile = {};
const GOOGLE_PROXY_URL = "https://script.google.com/macros/s/AKfycbyTlrixa43Psv9xyybmKi7qkF4dyJRavltMmMkzfXwSF3hQqAoGhW-WQuPvzynUDRDVEQ/exec";

// 1. DYNAMIC UI: ADD AD
window.addRentalAd = function () {
    if (adCounter >= 5) return alert("Limit 5 ads for demo.");
    adCounter++;
    const container = document.getElementById("ads-dynamic-list");
    const div = document.createElement("div");
    div.className = "ad-entry flex items-center gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100 mb-2";
    div.innerHTML = `
        <span class="text-[10px] font-black text-slate-400 w-8">#0${adCounter}</span>
        <input class="ad-input flex-1 border-none bg-transparent outline-none text-sm font-medium" placeholder="Paste details here...">
        <button onclick="this.parentElement.remove(); adCounter--;" class="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
    `;
    container.appendChild(div);
};

// 2. CORE EVALUATION ENGINE
function evaluateRentalOption(propertyRaw, profile) {
    const rent = parseFloat(propertyRaw.monthly_rent) || 0;
    const distance = parseFloat(propertyRaw.estimated_distance_km) || 0;
    
    let transportCost = 20;
    if (profile.transportMode === "Car") {
        transportCost = Math.round(distance * 0.65 * 2 * 22 + 70); 
    } else if (profile.transportMode === "Public Transport") {
        transportCost = Math.round(Math.min(11, distance * 0.45 + 2) * 22);
    }

    const totalCost = rent + transportCost + profile.commitments;
    const balance = profile.salary - totalCost;
    const depositRequired = rent * 2; // NORMAL DEPO 1+1 LOGIC

    let status = "PASSED";
    if (balance < 550) status = "RISK";
    else if ((rent / profile.salary) > 0.35) status = "CAUTION";
    else if (depositRequired > profile.depositBudget) status = "CAUTION";

    return {
        ...propertyRaw,
        monthly_rent: rent,
        estimated_distance_km: distance,
        transportCost,
        totalLivingCost: totalCost,
        disposableIncome: Math.max(0, balance),
        depositRequired: depositRequired,
        status,
        adIndex: propertyRaw.adIndex
    };
}

// 3. RUN ANALYSIS
window.runSmartAnalysis = async function () {
    userProfile = {
        salary: parseFloat(document.getElementById("salary").value) || 0,
        commitments: parseFloat(document.getElementById("commitments").value) || 0,
        depositBudget: parseFloat(document.getElementById("deposit_budget").value) || 0,
        workplace: document.getElementById("workplace").value.trim(),
        transportMode: document.getElementById("transport_mode").value
    };

    const inputs = Array.from(document.querySelectorAll(".ad-input")).map(i => i.value).filter(v => v);
    if (!userProfile.salary || !userProfile.workplace || inputs.length === 0) return alert("Complete all fields.");

    document.getElementById("loadingOverlay").style.display = "flex";

    try {
        const res = await fetch(GOOGLE_PROXY_URL, {
            method: "POST",
            body: JSON.stringify({
                model: "ilmu-glm-5.1",
                messages: [
                    { role: "system", content: "Return JSON array: [{\"area_name\":\"string\",\"monthly_rent\":number,\"estimated_distance_km\":number}]" },
                    { role: "user", content: `Workplace: ${userProfile.workplace}. Ads: ${inputs.join(" | ")}` }
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
        alert("AI Processing Error.");
    }
};

// 4. FIXED CHAT COMMAND (SYNCED WITH EVALUATION)
window.processChatCommand = function () {
    const input = document.getElementById("chatCommand");
    const cmd = input.value.trim().toLowerCase();
    
    // Support "ad 1 rent 800" or "ad 2 = 900"
    const match = cmd.match(/ad\s*(\d+)\s*(?:rent|price|is|=|rm)?\s*(\d+)/);
    
    if (match) {
        const adId = parseInt(match[1]);
        const newRent = parseFloat(match[2]);
        
        // Find index in current global array
        const idx = currentRankedAds.findIndex(p => p.adIndex === adId);
        
        if (idx !== -1) {
            // 1. Update the raw rent value
            currentRankedAds[idx].monthly_rent = newRent;
            
            // 2. Re-run through engine to update deposit, balance, and status
            const updatedData = evaluateRentalOption(currentRankedAds[idx], userProfile);
            
            // 3. Merge updated data back to array
            currentRankedAds[idx] = updatedData;
            
            // 4. Re-sort based on NEW disposable income
            currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);
            
            // 5. Re-render UI
            renderResultsUI(currentRankedAds);
            typeAssistantMessage(`✅ AD ${adId} updated to RM ${newRent}. Initial cost and rankings recalculated.`);
        } else {
            typeAssistantMessage(`⚠️ AD ${adId} not found in current results.`);
        }
    } else {
        typeAssistantMessage("⚠️ Try: 'AD 1 rent 850'");
    }
    input.value = "";
};

// 5. RENDER UI
function renderResultsUI(ranked) {
    const container = document.getElementById("resultsContainer");
    
    const summaryHeader = `
        <div class="mb-6 bg-slate-900 text-white p-5 rounded-[2.5rem] shadow-2xl">
            <div class="flex justify-between items-center border-b border-slate-700 pb-3 mb-3">
                <div>
                    <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Workplace Location</p>
                    <p class="text-lg font-black text-emerald-400">${userProfile.workplace}</p>
                </div>
                <div class="text-right">
                    <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Available Deposit</p>
                    <p class="text-lg font-black">RM ${userProfile.depositBudget}</p>
                </div>
            </div>
            <div class="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                <span>Salary: RM ${userProfile.salary}</span>
                <span>Commits: RM ${userProfile.commitments}</span>
            </div>
        </div>
    `;

    const cards = `<div class="grid-ranking space-y-4">` + ranked.map((item, idx) => `
        <div class="result-card p-6 bg-white border-2 ${idx === 0 ? 'border-emerald-500 shadow-emerald-100 shadow-lg' : 'border-slate-100'} rounded-[2.5rem] transition-all duration-500">
            <div class="flex justify-between items-start mb-4">
                <span class="bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">RANK #${idx + 1} · AD ${item.adIndex}</span>
                <span class="status-tag ${item.status === 'PASSED' ? 'bg-green-100 text-green-700' : (item.status === 'RISK' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')} font-black px-3 py-1 rounded-full text-[9px]">${item.status}</span>
            </div>
            <h3 class="font-black text-xl text-slate-800 leading-tight mb-1">${item.area_name}</h3>
            <p class="text-xs font-bold text-slate-400 mb-4">📍 ${item.estimated_distance_km}km from workplace</p>
            
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                <p class="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest">Normal Depo (1+1)</p>
                <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-slate-600">RM ${item.monthly_rent} + RM ${item.monthly_rent} =</span>
                    <span class="text-base font-black ${item.depositRequired > userProfile.depositBudget ? 'text-red-600' : 'text-slate-800'}">RM ${item.depositRequired}</span>
                </div>
                ${item.depositRequired > userProfile.depositBudget ? `<p class="text-[8px] text-red-500 font-black mt-1 uppercase tracking-tighter">⚠️ Over Deposit Budget by RM ${item.depositRequired - userProfile.depositBudget}</p>` : ''}
            </div>

            <div class="space-y-2 border-t border-dashed border-slate-200 pt-4">
                <div class="flex justify-between text-xs font-bold text-slate-500">
                    <span>Rent + Transport</span>
                    <span>RM ${item.monthly_rent} + RM ${item.transportCost}</span>
                </div>
                <div class="flex justify-between items-center mt-3 bg-blue-600 p-4 rounded-2xl text-white shadow-md">
                    <span class="text-[9px] font-black uppercase tracking-widest">Monthly Balance</span>
                    <span class="text-2xl font-black">RM ${item.disposableIncome.toFixed(0)}</span>
                </div>
            </div>
        </div>
    `).join('') + `</div>`;

    container.innerHTML = summaryHeader + cards;
}

function typeAssistantMessage(msg) {
    const msgBox = document.getElementById("aiMessageBox");
    const div = document.createElement("div");
    div.className = "bg-blue-700 text-white text-[10px] font-bold p-3 rounded-2xl mb-2 shadow-md animate-pulse";
    div.innerText = msg;
    msgBox.prepend(div);
}

window.closeResults = () => { document.getElementById("resultOverlay").style.display = "none"; };
window.resetFullForm = () => location.reload();
document.addEventListener('keypress', (e) => { if (e.key === 'Enter' && document.activeElement.id === 'chatCommand') processChatCommand(); });
