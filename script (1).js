/* ===== script.js: ใช้ร่วมกันทุกหน้า =====
   ตรวจจากองค์ประกอบ (id) ที่มีอยู่ในหน้า แล้วทำงานเฉพาะส่วนที่เกี่ยวข้อง
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
*/

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwGgavwfH6W7b0mDRTJXpn_c53rjVtmXKKJ0DpitwD-ss1-I-CeWVxRSqIh_ym7AdY/exec";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDcO_5HNwyt7llw7zIHjR6kfz84sCz912Ckiosj86BEG7vLsFiKOgUKxU0LvRWBMXrscMCz1rYYEgj/pub?gid=0&single=true&output=csv";

const MOODS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "Fresh", label: "Fresh" },
  { value: "Sweet", label: "Sweet" },
  { value: "Confident", label: "Confident" },
  { value: "Romance", label: "Romance" },
];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* ---------- 1) หน้า product.html ---------- */
function initProductPage() {
  const filterBar = document.getElementById("filter-bar");
  const list = document.getElementById("product-list");
  if (!filterBar || !list) return;

  let products = [];
  let activeMood = "all";

  function normalizeMood(value) {
    const found = MOODS.find(
      (m) => m.value.toLowerCase() === String(value || "").toLowerCase()
    );
    return found ? found.value : "all";
  }

  function formatPrice(price) {
    const n = Number(price);
    return Number.isFinite(n) && String(price).trim() !== ""
      ? n.toLocaleString("th-TH") + " บาท"
      : String(price);
  }

  function buildOrderUrl(p) {
    const item = p.size ? p.name + " " + p.size : p.name;
    const params = new URLSearchParams({ item: item, price: p.price });
    return "order.html?" + params.toString();
  }

  function buildCard(p) {
    const card = el("article", "card");
    if (p.mood) card.dataset.mood = p.mood;

    const media = el("div", "card__media");
    const img = document.createElement("img");
    img.src = p.image;
    img.alt = p.name;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      img.remove();
      media.appendChild(el("span", "card__fallback", "🛍️"));
    });
    media.appendChild(img);

    const body = el("div", "card__body");
    if (p.mood) body.appendChild(el("span", "badge", p.mood));
    body.appendChild(el("h3", "card__name", p.name));
    body.appendChild(el("p", "card__meta", p.size || ""));
    body.appendChild(el("p", "card__price", formatPrice(p.price)));

    const link = el("a", "btn btn-order", "สั่งซื้อ");
    link.href = buildOrderUrl(p);
    body.appendChild(link);

    card.append(media, body);
    return card;
  }

  function render() {
    const shown =
      activeMood === "all"
        ? products
        : products.filter(
            (p) => String(p.mood || "").toLowerCase() === activeMood.toLowerCase()
          );

    if (shown.length === 0) {
      list.replaceChildren(el("p", "empty", "ยังไม่มีสินค้าในหมวดนี้"));
      return;
    }
    list.replaceChildren(...shown.map(buildCard));
  }

  function renderFilterBar() {
    const buttons = MOODS.map((m) => {
      const btn = el("button", "filter-btn", m.label);
      btn.type = "button";
      btn.dataset.mood = m.value;
      btn.setAttribute("aria-pressed", String(m.value === activeMood));
      if (m.value === activeMood) btn.classList.add("active");
      btn.addEventListener("click", () => setMood(m.value));
      return btn;
    });
    filterBar.replaceChildren(...buttons);
  }

  function setMood(mood) {
    activeMood = mood;
    renderFilterBar();
    render();
  }

  activeMood = normalizeMood(new URLSearchParams(window.location.search).get("mood"));
  renderFilterBar();
  list.textContent = "กำลังโหลดสินค้า...";

  fetch("products.json")
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then((data) => {
      products = data;
      render();
    })
    .catch((error) => {
      console.error(error);
      list.textContent =
        "โหลดสินค้าไม่สำเร็จ กรุณาเปิดเว็บผ่านเซิร์ฟเวอร์ (เช่น Live Server) แล้วลองใหม่";
    });
}

/* ---------- 2) หน้า order.html ---------- */
function initOrderPage() {
  const form = document.getElementById("orderForm");
  if (!form) return;

  // เติม item และ price จาก URL ลงช่อง #items และ #total ทันทีที่โหลดหน้า
  const params = new URLSearchParams(window.location.search);
  const item = params.get("item");
  const price = params.get("price");
  const itemsInput = document.getElementById("items");
  const totalInput = document.getElementById("total");

  if (itemsInput && item !== null) itemsInput.value = item;
  if (totalInput && price !== null) totalInput.value = price;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const value = (id) => {
      const input = document.getElementById(id);
      return input ? input.value : "";
    };

    const payload = {
      customerName: value("customerName"),
      contact: value("contact"),
      items: value("items"),
      total: value("total"),
      note: value("note"),
    };

    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    });
  });
}

/* ---------- 3) หน้า admin.html ---------- */

// parse CSV เอง: รองรับ "..." , "" (เครื่องหมายคำพูดซ้อน), คอมมา และขึ้นบรรทัดใหม่ในช่อง
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // ตัด BOM

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // ตัดแถวว่างทั้งแถวออก
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function initAdminPage() {
  const tbody = document.querySelector("#ordersTable tbody");
  if (!tbody) return;

  const COLUMNS = 6; // วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ

  function messageRow(message) {
    const tr = document.createElement("tr");
    const td = el("td", "", message);
    td.colSpan = COLUMNS;
    td.style.textAlign = "center";
    tr.appendChild(td);
    return tr;
  }

  function formatTotal(value) {
    const n = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(n) && String(value).trim() !== ""
      ? n.toLocaleString("th-TH")
      : value;
  }

  tbody.replaceChildren(messageRow("กำลังโหลดข้อมูล..."));

  fetch(CSV_URL)
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    })
    .then((text) => {
      const rows = parseCSV(text);
      const dataRows = rows.slice(1).reverse(); // ข้ามหัวตาราง และเรียงล่าสุดขึ้นก่อน

      if (dataRows.length === 0) {
        tbody.replaceChildren(messageRow("ยังไม่มีรายการสั่งซื้อ"));
        return;
      }

      const trs = dataRows.map((r) => {
        const tr = document.createElement("tr");
        for (let i = 0; i < COLUMNS; i++) {
          const cell = r[i] !== undefined ? r[i] : "";
          tr.appendChild(el("td", "", i === 4 ? formatTotal(cell) : cell));
        }
        return tr;
      });
      tbody.replaceChildren(...trs);
    })
    .catch((error) => {
      console.error(error);
      tbody.replaceChildren(messageRow("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    });
}

/* ---------- เริ่มทำงาน ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initProductPage();
  initOrderPage();
  initAdminPage();
});
