const output = document.getElementById('output');
const input = document.getElementById('command-input');
const container = document.querySelector('.terminal-container');

let state = {
    sanity: 100,
    battery: 100,
    hasKey: false,
    currentRoom: "Dark Hallway",
    inventory: [],
    isRunning: true
};

const heartbeat = new Audio('assets/heartbeat.mp3');
heartbeat.loop = true;
heartbeat.volume = 0.4;
let audioStarted = false;

async function typeWrite(text, speed = 30) {
    const p = document.createElement('div');
    output.appendChild(p);
    const glitches = "@#$%&*?!";
    
    for (let char of text) {
        let charToType = char;
        if (state.sanity < 70 && char !== ' ') {
            if (Math.random() * 100 < (70 - state.sanity)) {
                charToType = glitches[Math.floor(Math.random() * glitches.length)];
            }
        }
        p.textContent += charToType;
        await new Promise(r => setTimeout(r, speed));
        output.scrollTop = output.scrollHeight;
    }
}

function triggerShake() {
    container.classList.add('shake');
    setTimeout(() => container.classList.remove('shake'), 200);
}

function updateVisuals() {
    if (state.sanity < 40) {
        document.body.classList.add('low-sanity');
    } else {
        document.body.classList.remove('low-sanity');
    }
}

function displayStats() {
    if (audioStarted) {
        // Speed up the heartbeat as sanity drops (1.0x speed at 100 sanity, up to ~2.5x at 0)
        const rate = 1 + ((100 - state.sanity) / 65);
        heartbeat.playbackRate = Math.min(rate, 3.0); // Cap at 3x speed
    }
    
    updateVisuals();

    const stats = document.createElement('div');
    stats.className = 'stat-line';
    const inv = state.inventory.length > 0 ? ` | INV: ${state.inventory.join(', ')}` : '';
    stats.innerHTML = `[ SANITY: ${state.sanity}% | BATTERY: ${state.battery}% ]${inv}<br>Location: ${state.currentRoom}`;
    output.appendChild(stats);
}

async function processInput(val) {
    const choice = val.trim();
    input.value = '';
    
    if (state.currentRoom === "Dark Hallway") {
        if (choice === "1") {
            await typeWrite("You move closer. It's not a light—it's a reflection of eyes.");
            state.sanity -= 15;
            triggerShake();
            state.battery -= 10;
        } else if (choice === "2") {
            state.currentRoom = "The Boiler Room";
            state.battery -= 15;
            await typeWrite("The air is boiling. Steam hisses like whispers.");
        } else if (choice === "3") {
            await typeWrite("In the silence, you hear footsteps... and they are faster than yours.");
            state.battery -= 2;
            state.sanity -= 5;
        } else if (choice === "4") {
            state.currentRoom = "Storage Closet";
            state.battery -= 5;
            await typeWrite("A cramped space smelling of ozone and old rubber.");
        } else if (choice === "5" && state.hasKey) {
            await typeWrite("You scramble up the ladder. Fresh air hits your face.");
            await typeWrite("You escaped... but the scratching sound followed you home.");
            state.isRunning = false;
        }
    } else if (state.currentRoom === "The Boiler Room") {
        if (choice === "1") {
            await typeWrite("You find a rusted key hidden behind the gauge!");
            state.hasKey = true;
            if (!state.inventory.includes("Rusted Key")) state.inventory.push("Rusted Key");
        } else if (choice === "2") {
            await typeWrite("A hand grabs your ankle from the shadows!");
            state.sanity -= 25;
            triggerShake();
        } else if (choice === "3") {
            state.currentRoom = "Dark Hallway";
            state.battery -= 15;
        }
    } else if (state.currentRoom === "Storage Closet") {
        if (choice === "1") {
            await typeWrite("You find a pack of old batteries! Flashlight restored.");
            state.battery = Math.min(state.battery + 50, 100); // Cap battery at 100
            if (!state.inventory.includes("Pills")) { // Add pills if not already there
                state.inventory.push("Pills");
                await typeWrite("You also find some suspicious looking pills.");
            }
        } else if (choice === "2" && state.inventory.includes("Pills")) {
            await typeWrite("You swallow the pills. Your mind feels a little clearer.");
            state.sanity = Math.min(state.sanity + 30, 100); 
            state.inventory = state.inventory.filter(item => item !== "Pills");
        } else if ((choice === "2" && !state.inventory.includes("Pills")) || (choice === "3")) {
            state.currentRoom = "Dark Hallway";
            state.battery -= 5;
        }
    }

    // Random Horror Event (Matching C++ logic)
    if (state.isRunning && Math.random() > 0.7) {
        await typeWrite("\n[!] The temperature drops suddenly. Your flashlight dims.");
        state.battery -= 5;
    }

    await checkGameOver();
    if (state.isRunning) await renderScene();
}

async function checkGameOver() {
    if (state.sanity <= 0) {
        triggerShake();
        await typeWrite("...The darkness consumed your mind. You are lost forever.");
        state.isRunning = false;
    } else if (state.battery <= 0) {
        await typeWrite("Flashlight dead. In the total darkness, the 'thing' doesn't need to hide anymore.");
        state.isRunning = false;
    }

    if (!state.isRunning && audioStarted) {
        heartbeat.pause(); // Stop the sound when the game ends
    }
    
    if (!state.isRunning) {
        await typeWrite("\n--- GAME OVER ---");
        input.disabled = true;
    }
}

async function renderScene() {
    displayStats();
    if (state.currentRoom === "Dark Hallway") {
        await typeWrite("1. Inspect the flickering light.");
        await typeWrite("2. Enter the heavy iron door on the left.");
        await typeWrite("3. Listen to the silence.");
        await typeWrite("4. Slip into the small Storage Closet.");
        if (state.hasKey) await typeWrite("5. Unlock the hatch and climb out.");
    } else if (state.currentRoom === "The Boiler Room") {
        await typeWrite("1. Check the pressure valves.");
        await typeWrite("2. Search the corners.");
        await typeWrite("3. Return to the hallway.");
    } else if (state.currentRoom === "Storage Closet") {
        const hasPills = state.inventory.includes("Pills");
        await typeWrite("1. Scavenge the shelves.");
        if (hasPills) {
            await typeWrite("2. Take the pills.");
            await typeWrite("3. Return to the hallway.");
        } else {
            await typeWrite("2. Return to the hallway.");
        }
    }
}

input.addEventListener('keypress', (e) => {
    // Trigger audio on first interaction to bypass browser autoplay blocks
    if (!audioStarted) {
        heartbeat.play().then(() => {
            audioStarted = true;
        }).catch(err => console.log("Audio waiting for interaction..."));
    }

    if (e.key === 'Enter') processInput(input.value);
});

// Start the game simulation
async function init() {
    await typeWrite(">> INITIALIZING NEURAL LINK...");
    await typeWrite(">> SUBJECT ID: 772-B (STABLE)");
    await typeWrite(">> SENSORY OVERRIDE: ENABLED");
    await typeWrite(">> WARNING: ANOMALY DETECTED IN FACILITY SECTOR 4");
    await typeWrite("--------------------------------------------------");
    await typeWrite("DEPTHS OF SILENCE - Terminal Boot v2.04");
    await typeWrite("Flashlight status: 100%. Heart Rate: 72 BPM.");
    await renderScene();
}
init();
