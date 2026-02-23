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
            const [dbName, shortAlias, subMenu, mainTitle] = line.split(',');
            tableData.push({ dbName, shortAlias, subMenu, mainTitle });
            if (!menuStructure[mainTitle]) menuStructure[mainTitle] = [];
            menuStructure[mainTitle].push({ dbName, subMenu });
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
        dropdown.innerHTML = `
            <button class="dropbtn">${mainTitle} ▾</button>
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

// 3. OBSŁUGA WIDOKÓW (KLUCZOWE POPRAWKI)
async function setTable(name) {
    // Ukrywamy formularz dodawania
    document.getElementById('add-card').style.display = 'none';
    const contentArea = document.getElementById('content-area');
    document.getElementById('table-select').value = name;

    contentArea.innerHTML = `<h2>Ładowanie: ${name}...</h2>`;

    try {
        const { data, error } = await sbClient.from(name).select('*');
        if (error) throw error;

        contentArea.innerHTML = `<h2>Baza: ${name}</h2>`;
        if (!data || data.length === 0) {
            contentArea.innerHTML += '<p>Baza jest pusta.</p>';
        } else {
            data.forEach((q, index) => {
                const qDiv = document.createElement('div');
                qDiv.className = 'card question-item';
                qDiv.style.marginBottom = "15px";
                qDiv.innerHTML = `
                    <p><strong>${index + 1}. ${q.pytanie}</strong></p>
                    <p>A: ${q.odp_a} | B: ${q.odp_b} | C: ${q.odp_c} | D: ${q.odp_d}</p>
                    <p style="color: green;">Poprawna: <strong>${q.poprawna}</strong></p>
                `;
                contentArea.appendChild(qDiv);
            });
        }
    } catch (err) {
        contentArea.innerHTML = `<h2 style="color:red;">Błąd: ${err.message}</h2>`;
    }
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
    document.querySelectorAll('#add-card input').forEach(i => i.value = "");
}