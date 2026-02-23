const SUPABASE_URL = "%%SUPABASE_URL%%";
const SUPABASE_KEY = "%%SUPABASE_KEY%%";
const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let tableData = []; 

// 1. Logowanie
function checkPassword() {
    if (document.getElementById('passInput').value === "%%APP_PASSWORD%%") {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('main-nav').style.display = 'flex';
        document.getElementById('main-container').style.display = 'block';
        loadConfig();
    } else { alert("Hasło złe!"); }
}

// 2. Ładowanie konfiguracji menu
async function loadConfig() {
    const response = await fetch('src/bd.txt');
    const text = await response.text();
    const menuStructure = {};
    text.trim().split('\n').forEach(line => {
        const [dbName, alias, sub, main] = line.split(',');
        tableData.push({ dbName, sub, main });
        if (!menuStructure[main]) menuStructure[main] = [];
        menuStructure[main].push({ dbName, sub });
    });
    renderMenu(menuStructure);
}

function renderMenu(structure) {
    const nav = document.getElementById('dynamic-menu');
    nav.innerHTML = Object.keys(structure).map(main => `
        <div class="dropdown">
            <button class="dropbtn">${main} ▾</button>
            <div class="dropdown-content">
                ${structure[main].map(i => `<a onclick="renderTableView('${i.dbName}')">${i.sub}</a>`).join('')}
            </div>
        </div>
    `).join('');
}

// 3. WIDOK: DODAJ DO BAZY (Wstrzykuje HTML formularza)
function renderAddForm() {
    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="card">
            <h2>Dodaj do bazy</h2>
            <select id="t-select">${tableData.map(t => `<option value="${t.dbName}">${t.main} - ${t.sub}</option>`).join('')}</select>
            <input type="text" id="q" placeholder="Pytanie">
            <div class="grid-inputs">
                <input type="text" id="a" placeholder="Odp A"> <input type="text" id="b" placeholder="Odp B">
                <input type="text" id="c" placeholder="Odp C"> <input type="text" id="d" placeholder="Odp D">
            </div>
            <select id="cor"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select>
            <button class="submit-btn" onclick="save()">Wyślij</button>
        </div>
    `;
}

// 4. WIDOK: TABELA (Wstrzykuje HTML tabeli)
async function renderTableView(name) {
    const content = document.getElementById('app-content');
    content.innerHTML = "<h2>Ładowanie...</h2>";
    const { data } = await sbClient.from(name).select('*');
    
    content.innerHTML = `<h1>Baza: ${name}</h1>` + data.map(q => `
        <div class="card">
            <p><strong>${q.pytanie}</strong></p>
            <p>A: ${q.odp_a} | B: ${q.odp_b} | C: ${q.odp_c} | D: ${q.odp_d}</p>
            <p style="color:green">Poprawna: ${q.poprawna}</p>
        </div>
    `).join('');
}

// 5. Zapisywanie
async function save() {
    const payload = {
        pytanie: document.getElementById('q').value,
        odp_a: document.getElementById('a').value,
        odp_b: document.getElementById('b').value,
        odp_c: document.getElementById('c').value,
        odp_d: document.getElementById('d').value,
        poprawna: document.getElementById('cor').value
    };
    const table = document.getElementById('t-select').value;
    const { error } = await sbClient.from(table).insert([payload]);
    if (error) alert(error.message); else { alert("Dodano!"); renderTableView(table); }
}