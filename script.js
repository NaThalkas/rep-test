// 0. ZMIENNE GLOBALNE
let SUPABASE_URL = "";
let SUPABASE_KEY = "";
let APP_PASSWORD = "";
let sbClient = null;
let tableData = []; 

function initSupabase() {
    // Rozpoznawanie: localhost, IP lokalne lub otwarcie pliku file:///
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "" || window.location.protocol === "file:";

    if (isLocal) {
        console.log("🛠️ Tryb lokalny");
        if (typeof LOCAL_CONFIG !== 'undefined') {
            SUPABASE_URL = LOCAL_CONFIG.SUPABASE_URL;
            SUPABASE_KEY = LOCAL_CONFIG.SUPABASE_KEY;
            APP_PASSWORD = LOCAL_CONFIG.APP_PASSWORD;
        } else {
            console.error("❌ BŁĄD: Brak pliku src/config.js");
        }
    } else {
        console.log("🌐 Tryb produkcyjny (GitHub)");
        SUPABASE_URL = "https://rdyyrjgolxxvzumcmjlb.supabase.co";
        SUPABASE_KEY = "sb_publishable_3KJmCBUaBR6Yup-yd92POQ_FaCacMBr";
        APP_PASSWORD = "JacaPraca";
    }

    if (SUPABASE_URL && SUPABASE_URL.startsWith("http")) {
        sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
}

initSupabase();

// 1. LOGOWANIE
function checkPassword() {
    const userTyped = document.getElementById('passInput').value;
    if (userTyped === APP_PASSWORD) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('main-nav').style.display = 'flex';
        document.getElementById('content-area').style.display = 'block';
        loadConfig(); 
    } else {
        alert("Niepoprawne hasło!");
    }
}

// 2. ŁADOWANIE STRUKTURY Z BD.TXT
async function loadConfig() {
    try {
        const response = await fetch('src/bd.txt');
        const text = await response.text();
        const lines = text.trim().split('\n');
        const menuStructure = {};
        tableData = [];

        lines.forEach(line => {
            const [dbName, shortAlias, subMenu, mainTitle, active] = line.split(',');
            
            // SPRAWDZENIE: Czy aktywna? (trim() usuwa zbędne spacje)
            if (active && active.trim().toLowerCase() === 'true') {
                tableData.push({ dbName, shortAlias, subMenu, mainTitle });
                if (!menuStructure[mainTitle]) menuStructure[mainTitle] = [];
                menuStructure[mainTitle].push({ dbName, subMenu });
            } else {
                console.log(`Pominięto nieaktywną tabele: ${dbName}`);
            }
        });

        buildMenu(menuStructure);
        buildTableSelect();
    } catch (err) {
        console.error("Błąd ładowania bd.txt. Jeśli pracujesz lokalnie (file:///), użyj Live Server!", err);
    }
}

function buildMenu(structure) {
    const nav = document.getElementById('dynamic-menu');
    nav.innerHTML = ''; 
    for (const mainTitle in structure) {
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown';
        
        // .replace(' ', '<br>') zamieni pierwszą spację na przejście do nowej linii
        const titleWithEnter = mainTitle.replace(' ', '<br>');
        
        dropdown.innerHTML = `
            <button class="dropbtn">${titleWithEnter} ▾</button>
            <div class="dropdown-content">
                ${structure[mainTitle].map(item => `<a onclick="setTable('${item.dbName}')">${item.subMenu}</a>`).join('')}
            </div>
        `;
        nav.appendChild(dropdown);
    }
}

function buildTableSelect() {
    const select = document.getElementById('table-select');
    select.innerHTML = ''; 
    tableData.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.dbName;
        opt.textContent = `${item.mainTitle} - ${item.subMenu}`;
        select.appendChild(opt);
    });
}

// Dodatkowa funkcja mieszająca (Algorytm Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 3. OBSŁUGA WIDOKÓW (KLUCZOWE POPRAWKI)
async function setTable(name) {
    document.getElementById('add-card').style.display = 'none';
    const contentArea = document.getElementById('content-area');
    document.getElementById('table-select').value = name;

    const currentInfo = tableData.find(item => item.dbName === name);
    const displayTitle = currentInfo ? `${currentInfo.mainTitle} - ${currentInfo.subMenu}` : name;

    contentArea.innerHTML = `<h2>${displayTitle}</h2>`;

    try {
        const { data, error } = await sbClient.from(name).select('*');
        if (error) throw error;

        data.forEach((q, index) => {
            const qDiv = document.createElement('div');
            qDiv.className = 'quiz-card';

            // 1. Przygotowanie kodu (zachowanie wcięć)
            let codeSection = "";
            const hasCode = q.code && 
                            q.code !== null && 
                            q.code.toString().toLowerCase() !== "null" && 
                            q.code.trim() !== "";

            if (hasCode) {
                codeSection = `
                    <div class="code-container">
                        <pre class="code-block"><code>${q.code}</code></pre>
                    </div>`;
            }

            // 2. MIESZANIE ODPOWIEDZI
            // Tworzymy tablicę obiektów, żeby pamiętać, która treść to która litera
            let options = [
                { letter: 'A', text: q.odp_a },
                { letter: 'B', text: q.odp_b },
                { letter: 'C', text: q.odp_c },
                { letter: 'D', text: q.odp_d }
            ];

            // Wywołujemy mieszanie
            options = shuffleArray(options);

            // 3. Generowanie HTML z wymieszanymi przyciskami
            qDiv.innerHTML = `
                <div class="quiz-question">
                    <span class="q-idx">${index + 1}.</span>
                    <pre class="formatted-question">${q.pytanie}</pre>
                </div>
                
                ${codeSection}

                <div class="quiz-options">
                    ${options.map(opt => `
                        <button class="opt-btn" 
                                data-letter="${opt.letter}" 
                                onclick="checkAnswer(this, '${opt.letter}', '${q.poprawna}')">
                            ${opt.text}
                        </button>
                    `).join('')}
                </div>
            `;
            contentArea.appendChild(qDiv);
        });
    } catch (err) {
        contentArea.innerHTML = `<h2 style="color:red;">Błąd: ${err.message}</h2>`;
    }
}

// Funkcja sprawdzająca odpowiedź
function checkAnswer(btn, selected, correct) {
    const parent = btn.parentElement;
    const buttons = parent.querySelectorAll('.opt-btn');
    
    buttons.forEach(b => {
        b.disabled = true;
        const btnLetter = b.getAttribute('data-letter'); 

        if (btnLetter === correct) {
            b.classList.add('correct');
        } else {
            b.classList.add('wrong');
        }
    });
}


function showAddPanel() {
    const card = document.getElementById('add-card');
    const contentArea = document.getElementById('content-area');

    if (card.style.display === 'none') {
        contentArea.innerHTML = ''; // Czyścimy pytania przy otwieraniu formularza
        card.style.display = 'block';
        card.scrollIntoView({ behavior: 'smooth' });
    } else {
        card.style.display = 'none';
    }
}

// 4. WYSYŁANIE DANYCH
async function sendToDatabase() {
    const table = document.getElementById('table-select').value;
    const payload = {
        pytanie: document.getElementById('q_text').value,
        code: document.getElementById('q_code').value.trim() || null,
        odp_a: document.getElementById('ans_a').value,
        odp_b: document.getElementById('ans_b').value,
        odp_c: document.getElementById('ans_c').value,
        odp_d: document.getElementById('ans_d').value,
        poprawna: document.getElementById('correct_ans').value
    };

    const { error } = await sbClient.from(table).insert([payload]);
    if (error) alert(error.message);
    else { 
        alert("Dodano pomyślnie!"); 
        clearForm(); 
        setTable(table); 
    }
}

function clearForm() {
document.querySelectorAll('#add-card input, #add-card textarea').forEach(i => i.value = "");
}