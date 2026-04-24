/**
 * SMARTRENT AI | Decision Intelligence Engine
 * VERSION: 3.7.0 (Production Master)
 * BRIDGE: Google Apps Script Proxy (Bypass All CORS)
 */

// ---------- GLOBAL STATE ----------
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
    newDiv.className = "ad-entry flex items-center gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100";
    newDiv.innerHTML = `
        <span class="text-[11px] font-black text-slate-500 w-8">AD ${adCounter}</span>
        <input class="ad-input flex-1 border-none bg-transparent outline-none text-sm font-medium" placeholder="Paste property link or details...">
        <button onclick="this.parentElement.remove(); adCounter--;" class="text-red-400 hover:text-red-600 text-xs font-bold w-6 h-6 rounded-full bg-white shadow-sm transition-all">✕</button>
    `;
    container.appendChild(newDiv);
};

// 2. FINANCIAL & SUSTAINABILITY ENGINE
function calculateTransportCost(transportMode, distanceKm) {
    if (!distanceKm || distanceKm <= 0) return 0;
    if (transportMode === "Walk") return 20;
    if (transportMode === "Car") {
        return Math.round(distanceKm * 0.65 * 2 * 22 + 70); // Petrol + Toll + Parking
    } else if (transportMode === "Public Transport") {
        return Math.round(Math.min(11, distanceKm * 0.45 + 2) * 22); // My50/Daily cap logic
    }
    return 0;
}

function evaluateRentalOption(propertyRaw, profile) {
    const rent = parseFloat(propertyRaw.monthly_rent) || 0;
    const distance = parseFloat(propertyRaw.estimated_distance_km) || 0;
    const transportCost = calculateTransportCost(profile.transportMode, distance);
    const totalLivingCost = rent + transportCost + (profile.commitments || 0);
    const leftover = profile.salary - totalLivingCost;
    const depositRequired = rent * 2.0;

    let status = "PASSED";
    let advice = "✅ Sustainable within your profile.";

    if (leftover < 550) {
        status = "RISK";
        advice = "❌ Financial strain: Disposable income below RM550.";
    } else if ((rent / profile.salary) > 0.36) {
        status = "CAUTION";
        advice = "⚠️ Rent exceeds 36% of salary.";
    } else if (depositRequired > profile.depositBudget) {
        status = "CAUTION";
        advice = `⚠️ Deposit shortfall: RM ${(depositRequired - profile.depositBudget).toFixed(0)}.`;
    }

    return {
        ...propertyRaw,
        monthly_rent: rent,
        estimated_distance_km: distance,
        transportCost,
        totalLivingCost,
        disposableIncome: Math.max(0, leftover),
        depositRequired: Math.round(depositRequired),
        status,
        advice,
        adIndex: propertyRaw.adIndex
    };
}

// 3. MAIN ANALYSIS VIA GOOGLE PROXY (CORS-FREE)
window.runSmartAnalysis = async function () {
    const salary = parseFloat(document.getElementById("salary").value);
    const workplace = document.getElementById("workplace").value.trim();

    if (!salary || !workplace) {
        alert("Please enter Monthly Salary and Workplace Location.");
        return;
    }

    userProfile = {
        salary,
        commitments: parseFloat(document.getElementById("commitments").value) || 0,
        depositBudget: parseFloat(document.getElementById("deposit_budget").value) || 0,
        workplace,
        transportMode: document.getElementById("transport_mode").value
    };

    const adInputs = Array.from(document.querySelectorAll(".ad-input"))
        .map(inp => inp.value.trim()).filter(v => v !== "");

    if (adInputs.length === 0) {
        alert("Add at least 1 rental ad to analyze.");
        return;
    }

    document.getElementById("loadingOverlay").style.display = "flex";

    try {
        // CALL TO GOOGLE APPS SCRIPT PROXY
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

    } catch (err) {
        document.getElementById("loadingOverlay").style.display = "none";
        console.error(err);
        alert("AI Engine is currently busy. Please try again in a few seconds.");
    }
};

// 4. INTERACTIVE CHAT COMMANDS
window.processChatCommand = function () {
    const inputField = document.getElementById("chatCommand");
    const rawCmd = inputField.value.trim().toLowerCase();
    if (!rawCmd) return;

    const regex = /ad\s*(\d+)\s*(?:rent|price|is|=|to|rm)?\s*(\d+)/;
    const match = rawCmd.match(regex);

    if (match) {
        const adNum = parseInt(match[1]);
        const newRent = parseFloat(match[2]);

        const targetIndex = currentRankedAds.findIndex(p => p.adIndex === adNum);

        if (targetIndex !== -1) {
            currentRankedAds[targetIndex].monthly_rent = newRent;
            const updated = evaluateRentalOption(currentRankedAds[targetIndex], userProfile);
            Object.assign(currentRankedAds[targetIndex], updated);

            currentRankedAds.sort((a, b) => b.disposableIncome - a.disposableIncome);
            renderResultsUI(currentRankedAds);
            typeAssistantMessage(`✅ AD ${adNum} rent updated to RM ${newRent}.`);
        }
    }
    inputField.value = "";
};

// 5. VIEW RENDERING
function renderResultsUI(ranked) {
    const container = document.getElementById("resultsContainer");

    container.innerHTML = `<div class="grid-ranking mt-4">` + ranked.map((item, idx) => `
        <div class="result-card p-6 bg-white border rounded-[2rem] ${idx === 0 ? 'border-2 border-emerald-500 shadow-lg' : 'border-slate-100'}">
            <div class="flex justify-between items-start mb-4">
                <div class="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">
                    RANK #${idx + 1} · AD ${item.adIndex}
                </div>
                <div class="status-tag ${item.status === 'PASSED' ? 'bg-green-100 text-green-800' : (item.status === 'CAUTION' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800')} font-black">
                    ${item.status}
                </div>
            </div>
            <h3 class="font-extrabold text-lg text-slate-800">${item.area_name || "Property"}</h3>
            <p class="text-xs text-slate-400 mb-4 font-semibold">📍 ${item.estimated_distance_km} km to workplace</p>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between text-slate-500"><span>Rent:</span><span class="text-slate-900 font-bold">RM ${item.monthly_rent}</span></div>
                <div class="flex justify-between font-black border-t border-dashed pt-2 mt-2">
                    <span>REAL LIVING COST:</span><span>RM ${item.totalLivingCost}</span>
                </div>
                <div class="bg-blue-600 p-4 rounded-2xl flex justify-between items-center text-white mt-3">
                    <span class="text-[10px] font-black uppercase">Balance</span>
                    <span class="text-xl font-black">RM ${item.disposableIncome.toFixed(0)}</span>
                </div>
            </div>
            <p class="text-[10px] font-bold text-slate-500 mt-4 bg-slate-50 p-3 rounded-xl">${item.advice}</p>
        </div>
    `).join('') + `</div>`;
}

function typeAssistantMessage(msg) {
    const msgBox = document.getElementById("aiMessageBox");
    const bubble = document.createElement("div");
    bubble.className = "bg-blue-700 text-white text-[11px] font-bold p-3 rounded-2xl mb-2 animate-fadeIn shadow-md";
    bubble.innerText = msg;
    msgBox.prepend(bubble);
}

window.closeResults = () => document.getElementById("resultOverlay").style.display = "none";
window.resetFullForm = () => { if (confirm("Clear data?")) location.reload(); };

// ENTER KEY BINDING
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && document.activeElement.id === 'chatCommand') processChatCommand();
});
