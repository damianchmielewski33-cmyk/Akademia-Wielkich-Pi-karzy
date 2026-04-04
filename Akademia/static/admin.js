document.addEventListener("DOMContentLoaded", () => {
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".section");
    const sidebar = document.querySelector(".sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");

    const modalOverlay = document.getElementById("modalOverlay");
    const modalCloseBtn = document.getElementById("modalCloseBtn");
    const modalContent = document.getElementById("modalContent");

    const logoutBtn = document.getElementById("logoutBtn");

    // API base (panel pod /panel-admina, API pod /admin/...)
    const API = {
        summary: "/admin/summary",
        activity: "/admin/activity",
        users: "/admin/users",
        user: id => `/admin/user/${id}`,
        userRole: id => `/admin/user/${id}/role`,
        matches: "/admin/matches",
        match: id => `/admin/match/${id}`,
        stats: "/admin/stats",
        stat: id => `/admin/stat/${id}`
    };

    /* NAVIGATION */

    navItems.forEach(btn => {
        btn.addEventListener("click", () => {
            navItems.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const target = btn.dataset.section;
            sections.forEach(sec => {
                sec.classList.toggle("visible", sec.id === `section-${target}`);
            });

            if (target === "dashboard") loadDashboard();
            if (target === "users") loadUsers();
            if (target === "matches") loadMatches();
            if (target === "stats") loadStats();
        });
    });

    /* SIDEBAR TOGGLE (MOBILE) */

    if (sidebarToggle) {
        sidebarToggle.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
        });
    }

    /* MODAL */

    function openModal(html) {
        modalContent.innerHTML = html;
        modalOverlay.classList.remove("hidden");
        attachModalHandlers();
    }

    function closeModal() {
        modalOverlay.classList.add("hidden");
        modalContent.innerHTML = "";
    }

    modalCloseBtn.addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", e => {
        if (e.target === modalOverlay) closeModal();
    });

    /* LOGOUT (tu możesz podpiąć swój endpoint) */

    logoutBtn.addEventListener("click", () => {
        openModal(`
            <h2>Wylogowanie</h2>
            <p>Czy na pewno chcesz się wylogować?</p>
            <div class="modal-actions">
                <button class="btn" id="cancelLogout">Anuluj</button>
                <button class="btn btn-delete" id="confirmLogout">Wyloguj</button>
            </div>
        `);
    });

    function attachModalHandlers() {
        const cancelLogout = document.getElementById("cancelLogout");
        const confirmLogout = document.getElementById("confirmLogout");
        if (cancelLogout) cancelLogout.onclick = closeModal;
        if (confirmLogout) {
            confirmLogout.onclick = () => {
                // tu możesz zrobić window.location = "/logout"
                window.location.href = "/logout";
            };
        }
    }

    /* DASHBOARD */

    async function loadDashboard() {
        try {
            const [summaryRes, activityRes] = await Promise.all([
                fetch(API.summary),
                fetch(API.activity)
            ]);

            const summary = await summaryRes.json();
            const activity = await activityRes.json();

            document.getElementById("dashPlayers").innerText = summary.players ?? "-";
            document.getElementById("dashMatches").innerText = summary.matches ?? "-";
            document.getElementById("dashStats").innerText = summary.stats ?? "-";

            const list = document.getElementById("activityList");
            list.innerHTML = "";
            activity.forEach(item => {
                const li = document.createElement("li");
                li.textContent = `${item.text} — ${item.time}`;
                list.appendChild(li);
            });
        } catch (e) {
            console.error("Błąd dashboard:", e);
        }
    }

    /* USERS */

    async function loadUsers() {
        try {
            const res = await fetch(API.users);
            const users = await res.json();
            const tbody = document.getElementById("usersTableBody");
            tbody.innerHTML = "";

            users.forEach(u => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${u.first_name}</td>
                    <td>${u.last_name}</td>
                    <td>${u.zawodnik ?? ""}</td>
                    <td>${u.role ?? ""}</td>
                    <td>
                        <button class="btn btn-edit" data-action="edit-user" data-id="${u.id}">Edytuj</button>
                        <button class="btn btn-delete" data-action="delete-user" data-id="${u.id}">Usuń</button>
                        <button class="btn btn-role" data-action="role-user" data-id="${u.id}">Rola</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            tbody.querySelectorAll("button").forEach(btn => {
                const id = btn.dataset.id;
                const action = btn.dataset.action;
                if (action === "edit-user") btn.onclick = () => openEditUser(id);
                if (action === "delete-user") btn.onclick = () => openDeleteUser(id);
                if (action === "role-user") btn.onclick = () => openRoleUser(id);
            });
        } catch (e) {
            console.error("Błąd users:", e);
        }
    }

    async function openEditUser(id) {
        try {
            const res = await fetch(API.user(id));
            const u = await res.json();

            openModal(`
                <h2>Edytuj użytkownika</h2>
                <form id="editUserForm">
                    <label>Imię
                        <input type="text" name="first_name" value="${u.first_name ?? ""}">
                    </label>
                    <label>Nazwisko
                        <input type="text" name="last_name" value="${u.last_name ?? ""}">
                    </label>
                    <label>Zawodnik
                        <input type="text" name="zawodnik" value="${u.zawodnik ?? ""}">
                    </label>
                    <label>Rola
                        <select name="role">
                            <option value="admin" ${u.role === "admin" ? "selected" : ""}>admin</option>
                            <option value="player" ${u.role === "player" ? "selected" : ""}>gracz</option>
                        </select>
                    </label>
                    <div class="modal-actions">
                        <button type="button" class="btn" id="cancelEditUser">Anuluj</button>
                        <button type="submit" class="btn btn-edit">Zapisz</button>
                    </div>
                </form>
            `);

            const form = document.getElementById("editUserForm");
            document.getElementById("cancelEditUser").onclick = closeModal;

            form.onsubmit = async e => {
                e.preventDefault();
                const formData = new FormData(form);
                const payload = Object.fromEntries(formData.entries());
                try {
                    await fetch(API.user(id), {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                    closeModal();
                    loadUsers();
                } catch (err) {
                    console.error("Błąd zapisu user:", err);
                }
            };
        } catch (e) {
            console.error("Błąd openEditUser:", e);
        }
    }

    function openDeleteUser(id) {
        openModal(`
            <h2>Usuń użytkownika</h2>
            <p>Czy na pewno chcesz usunąć użytkownika #${id}?</p>
            <div class="modal-actions">
                <button class="btn" id="cancelDeleteUser">Anuluj</button>
                <button class="btn btn-delete" id="confirmDeleteUser">Usuń</button>
            </div>
        `);

        document.getElementById("cancelDeleteUser").onclick = closeModal;
        document.getElementById("confirmDeleteUser").onclick = async () => {
            try {
                await fetch(API.user(id), { method: "DELETE" });
                closeModal();
                loadUsers();
            } catch (e) {
                console.error("Błąd delete user:", e);
            }
        };
    }

    async function openRoleUser(id) {
        try {
            const res = await fetch(API.user(id));
            const u = await res.json();

            openModal(`
                <h2>Zmiana roli</h2>
                <p>Aktualna rola: <strong>${u.role ?? "-"}</strong></p>
                <div class="modal-actions">
                    <button class="btn" id="rolePlayer">Gracz</button>
                    <button class="btn btn-edit" id="roleAdmin">Admin</button>
                </div>
            `);

            document.getElementById("rolePlayer").onclick = () => setUserRole(id, "player");
            document.getElementById("roleAdmin").onclick = () => setUserRole(id, "admin");
        } catch (e) {
            console.error("Błąd openRoleUser:", e);
        }
    }

    async function setUserRole(id, role) {
        try {
            await fetch(API.userRole(id), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role })
            });
            closeModal();
            loadUsers();
        } catch (e) {
            console.error("Błąd setUserRole:", e);
        }
    }

    /* MATCHES */

    async function loadMatches() {
        try {
            const res = await fetch(API.matches);
            const matches = await res.json();
            const tbody = document.getElementById("matchesTableBody");
            tbody.innerHTML = "";

            matches.forEach(m => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${m.id}</td>
                    <td>${m.date}</td>
                    <td>${m.time}</td>
                    <td>${m.location}</td>
                    <td>${m.players_count ?? "-"}</td>
                    <td>
                        <button class="btn btn-edit" data-action="edit-match" data-id="${m.id}">Edytuj</button>
                        <button class="btn btn-delete" data-action="delete-match" data-id="${m.id}">Usuń</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            tbody.querySelectorAll("button").forEach(btn => {
                const id = btn.dataset.id;
                const action = btn.dataset.action;
                if (action === "edit-match") btn.onclick = () => openEditMatch(id);
                if (action === "delete-match") btn.onclick = () => openDeleteMatch(id);
            });
        } catch (e) {
            console.error("Błąd matches:", e);
        }
    }

    async function openEditMatch(id) {
        try {
            const res = await fetch(API.match(id));
            const m = await res.json();

            openModal(`
                <h2>Edytuj mecz</h2>
                <form id="editMatchForm">
                    <label>Data
                        <input type="date" name="date" value="${m.date ?? ""}">
                    </label>
                    <label>Godzina
                        <input type="time" name="time" value="${m.time ?? ""}">
                    </label>
                    <label>Lokalizacja
                        <input type="text" name="location" value="${m.location ?? ""}">
                    </label>
                    <div class="modal-actions">
                        <button type="button" class="btn" id="cancelEditMatch">Anuluj</button>
                        <button type="submit" class="btn btn-edit">Zapisz</button>
                    </div>
                </form>
            `);

            const form = document.getElementById("editMatchForm");
            document.getElementById("cancelEditMatch").onclick = closeModal;

            form.onsubmit = async e => {
                e.preventDefault();
                const formData = new FormData(form);
                const payload = Object.fromEntries(formData.entries());
                try {
                    await fetch(API.match(id), {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                    closeModal();
                    loadMatches();
                } catch (err) {
                    console.error("Błąd zapisu match:", err);
                }
            };
        } catch (e) {
            console.error("Błąd openEditMatch:", e);
        }
    }

    function openDeleteMatch(id) {
        openModal(`
            <h2>Usuń mecz</h2>
            <p>Czy na pewno chcesz usunąć mecz #${id}?</p>
            <div class="modal-actions">
                <button class="btn" id="cancelDeleteMatch">Anuluj</button>
                <button class="btn btn-delete" id="confirmDeleteMatch">Usuń</button>
            </div>
        `);

        document.getElementById("cancelDeleteMatch").onclick = closeModal;
        document.getElementById("confirmDeleteMatch").onclick = async () => {
            try {
                await fetch(API.match(id), { method: "DELETE" });
                closeModal();
                loadMatches();
            } catch (e) {
                console.error("Błąd delete match:", e);
            }
        };
    }

    /* STATS */

    async function loadStats() {
        try {
            const res = await fetch(API.stats);
            const stats = await res.json();
            const tbody = document.getElementById("statsTableBody");
            tbody.innerHTML = "";

            stats.forEach(s => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${s.id}</td>
                    <td>${s.zawodnik ?? ""}</td>
                    <td>${s.match_id ?? ""}</td>
                    <td>${s.goals}</td>
                    <td>${s.assists}</td>
                    <td>${s.distance}</td>
                    <td>${s.saves ?? 0}</td>
                    <td>
                        <button class="btn btn-edit" data-action="edit-stat" data-id="${s.id}">Edytuj</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            tbody.querySelectorAll("button").forEach(btn => {
                const id = btn.dataset.id;
                const action = btn.dataset.action;
                if (action === "edit-stat") btn.onclick = () => openEditStat(id);
            });
        } catch (e) {
            console.error("Błąd stats:", e);
        }
    }

    async function openEditStat(id) {
        try {
            const res = await fetch(API.stat(id));
            const s = await res.json();

            openModal(`
                <h2>Edytuj statystyki</h2>
                <form id="editStatForm">
                    <label>Gole
                        <input type="number" name="goals" value="${s.goals ?? 0}">
                    </label>
                    <label>Asysty
                        <input type="number" name="assists" value="${s.assists ?? 0}">
                    </label>
                    <label>Dystans
                        <input type="number" step="0.1" name="distance" value="${s.distance ?? 0}">
                    </label>
                    <label>Obronione strzały
                        <input type="number" name="saves" value="${s.saves ?? 0}">
                    </label>
                    <div class="modal-actions">
                        <button type="button" class="btn" id="cancelEditStat">Anuluj</button>
                        <button type="submit" class="btn btn-edit">Zapisz</button>
                    </div>
                </form>
            `);

            const form = document.getElementById("editStatForm");
            document.getElementById("cancelEditStat").onclick = closeModal;

            form.onsubmit = async e => {
                e.preventDefault();
                const formData = new FormData(form);
                const payload = Object.fromEntries(formData.entries());
                try {
                    await fetch(API.stat(id), {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                    closeModal();
                    loadStats();
                } catch (err) {
                    console.error("Błąd zapisu stat:", err);
                }
            };
        } catch (e) {
            console.error("Błąd openEditStat:", e);
        }
    }

    /* START */

    loadDashboard();
});
