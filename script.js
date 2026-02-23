const SUPABASE_URL = "%%SUPABASE_URL%%";
const SUPABASE_KEY = "%%SUPABASE_KEY%%";

const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let tableData = []; 

// 1. ŁADOWANIE KONFIGURACJI Z PLIKU
async function loadConfig() {
    try {
        const response = await fetch('src/bd.txt');
        const text = await response.text();
        const lines = text.trim().split('\n');
        
        const menuStructure = {};

        lines.forEach(line => {
            const [dbName, shortAlias, subMenu, mainTitle] = line.split(',');
            tableData.push({ dbName, shortAlias, subMenu, mainTitle });

            if (!menuStructure[mainTitle]) menuStructure[mainTitle] = [];
            menuStructure[mainTitle].push({ dbName, subMenu });
        });

        buildMenu(menuStructure);
        buildTableSelect();
    } catch (err) {
        console.error("Błąd ładowania bd.txt:", err);
    }
}

// 2. BUDOWANIE DYNAMICZNEGO MENU
function buildMenu(structure) {
    const nav = document.getElementById('dynamic-menu');
    nav.innerHTML = ''; // Czyścimy przed budowaniem
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

// 3. WYPEŁNIANIE SELECTA W FORMULARZU
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

// 4. KLIKNIĘCIE W KATEGORIĘ - POBIERANIE DANYCH
async function setTable(name) {
    // Ustawiamy tabelę w ukrytym selectcie formularza
    document.getElementById('table-select').value = name;
    
    // Ukrywamy formularz dodawania (żeby nie zasłaniał bazy)
    document.getElementById('add-card').style.display = 'none';

    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = '<h2>Ładowanie danych...</h2>';

    try {
        const { data, error } = await sbClient
            .from(name)
            .select('*');

        if (error) throw error;

        if (!data || data.length === 0) {
            contentArea.innerHTML = '<h2 class="empty-state">Baza danych pusta</h2>';
        } else {
            // Generujemy listę pytań
            contentArea.innerHTML = `<h2>Zawartość: ${name}</h2>`;
            data.forEach((q, index) => {
                const qDiv = document.createElement('div');
                qDiv.className = 'question-item';
                qDiv.innerHTML = `
                    <div class="card">
                        <p><strong>${index + 1}. ${q.pytanie}</strong></p>
                        <ul style="list-style: none; padding-left: 10px;">
                            <li>A) ${q.odp_a}</li>
                            <li>B) ${q.odp_b}</li>
                            <li>C) ${q.odp_c}</li>
                            <li>D) ${q.odp_d}</li>
                        </ul>
                        <p style="color: green;">Poprawna: <strong>${q.poprawna}</strong></p>
                    </div>
                `;
                contentArea.appendChild(qDiv);
            });
        }
    } catch (err) {
        contentArea.innerHTML = `<h2 style="color:red;">Błąd: ${err.message}</h2>`;
    }
}

// 5. POKAZYWANIE PANELU DODAWANIA (NA PRZYCISK +)
function showAddPanel() {
    const card = document.getElementById('add-card');
    // Przełączanie widoczności (toggle)
    if(card.style.display === 'none' || card.style.display === '') {
        card.style.display = 'block';
        // Przewiń do formularza
        card.scrollIntoView({ behavior: 'smooth' });
    } else {
        card.style.display = 'none';
    }
}

function checkPassword() {
    const userTyped = document.getElementById('passInput').value;
    const secretPassword = "%%APP_PASSWORD%%"; 

    if (userTyped === secretPassword) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('main-nav').style.display = 'flex';
        document.getElementById('content-area').style.display = 'block';
        loadConfig(); 
    } else {
        alert("Błąd! Niepoprawne hasło.");
    }
}

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
        alert("Dodano!"); 
        clearForm(); 
        setTable(table); // Odśwież widok po dodaniu
    }
}

function clearForm() {
    document.querySelectorAll('#add-card input').forEach(i => i.value = "");
}
