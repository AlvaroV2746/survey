import { TEXTOS } from "./i18n.js";

const PASOS = [
  {
    id: "google",
    titleKey: "step_google",
    links: [{ url: "https://g.page/r/CSnP1zKUJTQ3EBM/review" }]
  },
  {
    id: "tripadvisor",
    titleKey: "step_tripadvisor",
    links: [{ url: "https://www.tripadvisor.com/UserReviewEdit-g297478-d34823213-Bluco_Travel-Medellin_Antioquia_Department.html" }]
  },
  {
    id: "social",
    titleKey: "step_social",
    links: [
      { label: "Instagram", url: "https://www.instagram.com/blucotravelco/" },
      { label: "TikTok", url: "https://www.tiktok.com/@blucotravelco" }
    ]
  },
  { id: "premio", titleKey: "step_premio" }
];

const TIEMPO_ESPERA = 13000;
const STORAGE_KEY = "blucoEncuesta";
const PREMIO_ID = "premio";

const estado = cargarEstado();
let ultimoCompletado = null;
let lang = estado.lang || ((navigator.language || "").toLowerCase().startsWith("es") ? "es" : "en");
let vigilancia = null;

function cargarEstado() {
  try {
    const guardado = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (guardado) return { lang: null, completed: [], started: {}, primerLink: {}, ...guardado };
  } catch (e) {}
  return { lang: null, completed: [], started: {}, primerLink: {} };
}

function guardar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
}

function t(key) {
  return TEXTOS[lang][key];
}

function textoLink(paso, link) {
  return link.label || t(paso.titleKey);
}

function urlInicial(paso) {
  return estado.primerLink[paso.id] || paso.links[0].url;
}

function render() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-lang]").forEach(btn => {
    btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
  });

  const contenedor = document.getElementById("steps");
  contenedor.innerHTML = "";
  let pasoActivoEncontrado = false;

  PASOS.forEach((paso, i) => {
    const completado = estado.completed.includes(paso.id);
    const activo = !completado && !pasoActivoEncontrado;
    if (activo) pasoActivoEncontrado = true;

    const esperando = activo && !!estado.started[paso.id];
    const el = document.createElement("div");
    el.className = "step " + (completado ? "is-done" : activo ? "is-active" : "is-locked") + (esperando ? " is-waiting" : "") + (paso.id === ultimoCompletado ? " is-just-done" : "");

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = completado ? "✓" : String(i + 1);
    el.appendChild(badge);

    if (completado || activo) {
      const titulo = document.createElement("p");
      titulo.className = "step-title";
      titulo.textContent = t(paso.titleKey);
      el.appendChild(titulo);
    }

    if (activo) {
      if (paso.links) {
        const grupo = document.createElement("div");
        grupo.className = "btn-group";
        paso.links.forEach(link => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn";
          btn.textContent = textoLink(paso, link);
          btn.addEventListener("click", () => abrirPaso(paso, link.url));
          grupo.appendChild(btn);
        });
        el.appendChild(grupo);
      } else {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn";
        btn.textContent = t("btn_premio");
        btn.addEventListener("click", reclamar);
        el.appendChild(btn);
      }

      if (esperando) {
        const estadoEspera = document.createElement("p");
        estadoEspera.className = "status";
        estadoEspera.innerHTML = `<span></span><span class="dots"><i></i><i></i><i></i></span>`;
        estadoEspera.firstChild.textContent = t("status_waiting");
        el.appendChild(estadoEspera);

        const reintentar = document.createElement("button");
        reintentar.type = "button";
        reintentar.className = "retry";
        reintentar.textContent = t("retry");
        reintentar.addEventListener("click", () => window.open(urlInicial(paso), "_blank", "noopener,noreferrer"));
        el.appendChild(reintentar);
      } else {
        const ayuda = document.createElement("p");
        ayuda.className = "hint";
        ayuda.textContent = t(paso.links ? "hint_link" : "hint_premio");
        el.appendChild(ayuda);
      }
    } else if (!completado) {
      el.setAttribute("aria-disabled", "true");
    }

    contenedor.appendChild(el);

    if (i < PASOS.length - 1) {
      const flecha = document.createElement("div");
      flecha.className = "arrow";
      flecha.setAttribute("aria-hidden", "true");
      flecha.textContent = "↓";
      contenedor.appendChild(flecha);
    }
  });
}

function abrirPaso(paso, url) {
  window.open(url, "_blank", "noopener,noreferrer");
  if (!estado.started[paso.id]) {
    estado.started[paso.id] = Date.now();
    estado.primerLink[paso.id] = url;
    guardar();
    iniciarVigilancia();
    render();
  }
}

function revisarEsperas() {
  const ahora = Date.now();
  let cambio = false;

  for (const id of Object.keys(estado.started)) {
    if (ahora - estado.started[id] >= TIEMPO_ESPERA) {
      if (!estado.completed.includes(id)) estado.completed.push(id);
      delete estado.started[id];
      ultimoCompletado = id;
      cambio = true;
    }
  }

  if (cambio) {
    guardar();
    render();
    ultimoCompletado = null;
  }

  if (Object.keys(estado.started).length === 0 && vigilancia) {
    clearInterval(vigilancia);
    vigilancia = null;
  }
}

function iniciarVigilancia() {
  if (!vigilancia) vigilancia = setInterval(revisarEsperas, 250);
}

function reclamar() {
  if (!estado.completed.includes(PREMIO_ID)) {
    estado.completed.push(PREMIO_ID);
    guardar();
  }
  mostrarFinal(true);
}

function mostrarFinal(animar) {
  const card = document.getElementById("card");
  const thanks = document.getElementById("thanks");
  document.body.classList.add("is-done");

  const mostrarGracias = () => {
    card.hidden = true;
    thanks.hidden = false;
    requestAnimationFrame(() => thanks.classList.add("is-visible"));
  };

  if (animar) {
    card.classList.add("is-fading");
    setTimeout(mostrarGracias, 800);
  } else {
    mostrarGracias();
  }
}

document.querySelectorAll("[data-lang]").forEach(btn => {
  btn.addEventListener("click", () => {
    lang = btn.dataset.lang;
    estado.lang = lang;
    guardar();
    render();
  });
});

function volverAEmpezar() {
  estado.completed = [];
  estado.started = {};
  estado.primerLink = {};
  guardar();

  const card = document.getElementById("card");
  const thanks = document.getElementById("thanks");
  document.body.classList.remove("is-done");
  thanks.classList.remove("is-visible");
  thanks.hidden = true;
  card.classList.remove("is-fading");
  card.hidden = false;
  render();
}

document.getElementById("reiniciar").addEventListener("click", volverAEmpezar);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) revisarEsperas();
});

render();
if (estado.completed.includes(PREMIO_ID)) mostrarFinal(false);
if (Object.keys(estado.started).length > 0) iniciarVigilancia();
