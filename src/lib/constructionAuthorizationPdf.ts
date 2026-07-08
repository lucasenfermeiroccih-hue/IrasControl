import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export interface AuthorizationPrefill {
  localizacao?: string;
  coordenador?: string;
  hospitalId?: string;
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LINE_GAP = 5.2;

async function loadLogo(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    return { dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

async function loadHospitalLogos(hospitalId: string): Promise<{
  hospitalLogo: { dataUrl: string; w: number; h: number } | null;
  scihLogos: Array<{ dataUrl: string; w: number; h: number }>;
}> {
  try {
    const { data: logos } = await supabase
      .from("hospital_logos")
      .select("logo_type, storage_path, display_order")
      .eq("hospital_id", hospitalId)
      .order("display_order");

    if (!logos?.length) return { hospitalLogo: null, scihLogos: [] };

    const getUrl = (path: string) =>
      supabase.storage.from("hospital-logos").getPublicUrl(path).data.publicUrl;

    const hospitalRec = logos.find((l: any) => l.logo_type === "hospital");
    const scihRecs = logos.filter((l: any) => l.logo_type === "scih");

    const [hospitalLogo, ...scihResults] = await Promise.all([
      hospitalRec ? loadLogo(getUrl(hospitalRec.storage_path)) : Promise.resolve(null),
      ...scihRecs.map((r: any) => loadLogo(getUrl(r.storage_path))),
    ]);

    return {
      hospitalLogo,
      scihLogos: scihResults.filter((l): l is { dataUrl: string; w: number; h: number } => l !== null),
    };
  } catch {
    return { hospitalLogo: null, scihLogos: [] };
  }
}

export async function buildConstructionAuthorizationPdf(prefill: AuthorizationPrefill = {}) {
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      pdf.addPage();
      y = MARGIN;
    }
  };

  // --- Cabeçalho com logos (hospital à esquerda, SCIH logos à direita) ---
  const { hospitalLogo, scihLogos } = prefill.hospitalId
    ? await loadHospitalLogos(prefill.hospitalId)
    : { hospitalLogo: null, scihLogos: [] };

  const headerH = 20;
  if (hospitalLogo) {
    const h = headerH;
    const w = Math.min(48, (hospitalLogo.w / hospitalLogo.h) * h);
    pdf.addImage(hospitalLogo.dataUrl, "PNG", MARGIN, y, w, h);
  }

  // Renderizar logos SCIH à direita (uma ou mais)
  if (scihLogos.length > 0) {
    let logoX = PAGE_W - MARGIN;
    for (const logo of [...scihLogos].reverse().slice(0, 3)) {
      const h = headerH;
      const w = Math.min(34, (logo.w / logo.h) * h);
      logoX -= w;
      pdf.addImage(logo.dataUrl, "PNG", logoX, y, w, h);
      logoX -= 2;
    }
  }

  // Texto central
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(hospitalLogo ? 11 : 14);
  pdf.text("Hospital — Controle de Infecções", PAGE_W / 2, y + 8, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Comissão de Controle de Infecção Hospitalar (CCIH/SCIH)", PAGE_W / 2, y + 14, { align: "center" });
  y += headerH + 4;

  pdf.setDrawColor(150);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  const titleLines = pdf.splitTextToSize(
    "Autorização do Controle de Infecções para Obras/Reformas",
    CONTENT_W
  );
  pdf.text(titleLines, PAGE_W / 2, y, { align: "center" });
  y += titleLines.length * 6 + 4;

  // --- Helpers de seção ---
  const sectionTitle = (text: string) => {
    ensureSpace(12);
    pdf.setFillColor(230, 236, 245);
    pdf.rect(MARGIN, y, CONTENT_W, 7, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(20, 40, 80);
    pdf.text(text, MARGIN + 2, y + 5);
    pdf.setTextColor(0, 0, 0);
    y += 11;
  };

  const subTitle = (text: string) => {
    ensureSpace(9);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(text, MARGIN, y);
    y += 6;
  };

  const paragraph = (text: string, opts: { italic?: boolean; size?: number; indent?: number } = {}) => {
    pdf.setFont("helvetica", opts.italic ? "italic" : "normal");
    pdf.setFontSize(opts.size ?? 9.5);
    const indent = opts.indent ?? 0;
    const lines = pdf.splitTextToSize(text, CONTENT_W - indent);
    lines.forEach((ln: string) => {
      ensureSpace(LINE_GAP);
      pdf.text(ln, MARGIN + indent, y);
      y += LINE_GAP;
    });
  };

  // Item com checkbox (quadradinho para marcar)
  const checkItem = (text: string) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    const boxSize = 3.4;
    const textIndent = 6;
    const lines = pdf.splitTextToSize(text, CONTENT_W - textIndent);
    ensureSpace(Math.max(LINE_GAP, lines.length * LINE_GAP));
    // quadrado de marcação alinhado com a primeira linha
    pdf.setDrawColor(80);
    pdf.rect(MARGIN, y - 3.2, boxSize, boxSize);
    lines.forEach((ln: string, i: number) => {
      if (i > 0) ensureSpace(LINE_GAP);
      pdf.text(ln, MARGIN + textIndent, y);
      y += LINE_GAP;
    });
  };

  // Linha de campo: rótulo + área preenchível
  const fieldRow = (label: string, value = "") => {
    const rowH = 8;
    ensureSpace(rowH);
    const labelW = 62;
    pdf.setDrawColor(170);
    pdf.rect(MARGIN, y, labelW, rowH);
    pdf.rect(MARGIN + labelW, y, CONTENT_W - labelW, rowH);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    const lblLines = pdf.splitTextToSize(label, labelW - 4);
    pdf.text(lblLines, MARGIN + 2, y + 5);
    if (value) {
      pdf.setFont("helvetica", "normal");
      pdf.text(pdf.splitTextToSize(value, CONTENT_W - labelW - 4), MARGIN + labelW + 2, y + 5);
    }
    y += rowH;
  };

  const numberedList = (items: string[]) => {
    items.forEach((it, i) => {
      paragraph(`${i + 1}. ${it}`, { indent: 3 });
      y += 0.5;
    });
  };

  const gap = (h = 3) => {
    y += h;
  };

  // ============ 1. Identificação ============
  sectionTitle("1. Identificação da Autorização");
  fieldRow("Autorização nº");
  fieldRow("Localização da obra/reforma", prefill.localizacao || "");
  fieldRow("Coord. do projeto", prefill.coordenador || "");
  fieldRow("Nome da empreiteira");
  fieldRow("Supervisor");
  fieldRow("Telefone");
  fieldRow("Data de início aproximada");
  fieldRow("Prazo aproximado para término");
  fieldRow("Vencimento da autorização");
  gap(4);

  // ============ 2. Atividade da Construção ============
  sectionTitle("2. Atividade da Construção");
  paragraph("Assinale as atividades envolvidas.", { italic: true });
  gap(1);

  subTitle("Tipo A — Inspeção e Atividades Não Invasivas");
  paragraph("Inclui, mas não se limita a:");
  checkItem("Remoção de telhas para inspeção visual limitada a 1 telha por 4,5 metros quadrados;");
  checkItem("Pintura, sem incluir lixamentos;");
  checkItem(
    "Revestimento de paredes, serviços elétricos, instalação de canos e atividades que não gerem poeira ou exijam perfuração de paredes ou acesso aos tetos, exceto para inspeção visual."
  );
  gap(2);

  subTitle("Tipo B — Atividades de Pequena Escala ou Curta Duração");
  paragraph("Atividades que produzem quantidades mínimas de poeira. Inclui, mas não se limita a:");
  checkItem("Instalação de cabos de telefone ou de computador;");
  checkItem("Acesso a fendas ou rachaduras;");
  checkItem("Perfuração de paredes ou de tetos com controle de migração de poeira.");
  gap(2);

  subTitle("Tipo C — Trabalhos com Produção Moderada ou Elevada de Poeira");
  paragraph(
    "Trabalhos que produzem pó moderado ou demasiado, ou que exigem demolição ou remoção de componentes/conjuntos fixos de prédios. Inclui, mas não se limita a:"
  );
  checkItem("Lixamento de paredes para pintura e revestimento;");
  checkItem("Remoção de revestimento de pisos, telhas e caixilhos/batentes;");
  checkItem("Construção de paredes novas;");
  checkItem("Trabalhos menores executados em ductos ou serviços de eletricidade realizados acima dos tetos;");
  checkItem("Atividades maiores de cablagem;");
  checkItem("Qualquer atividade que não seja possível concluir dentro de apenas um turno de trabalho.");
  gap(2);

  subTitle("Tipo D — Grandes Demolições e Projetos de Grande Porte");
  paragraph("Inclui, mas não se limita a:");
  checkItem("Atividades que exijam turnos consecutivos de trabalho;");
  checkItem("Atividades que exijam demolição pesada ou remoção de sistemas completos de cabos;");
  checkItem("Construções novas.");
  gap(4);

  // ============ 3. Grupo de Risco ============
  sectionTitle("3. Grupo de Risco do Controle de Infecções");
  paragraph("Assinale as áreas envolvidas.", { italic: true });
  gap(1);

  subTitle("Grupo 1 — Risco Baixo");
  checkItem("Áreas administrativas;");
  checkItem("Áreas sem pacientes.");
  gap(2);

  subTitle("Grupo 2 — Risco Médio");
  checkItem("Ambulatórios;");
  checkItem("Áreas com pacientes não relacionadas aos grupos 3 e 4;");
  checkItem("Áreas de armazenamento e distribuição de materiais;");
  checkItem("Áreas de fisioterapia/fonoaudiologia;");
  checkItem("Áreas de internamento e recepção;");
  checkItem("Corredores públicos por onde circulam pacientes, suprimentos e roupas;");
  checkItem("Cozinha;");
  checkItem("Ecografia;");
  checkItem("Laboratórios, exceto os do grupo 3;");
  checkItem("Refeitório.");
  gap(2);

  subTitle("Grupo 3 — Risco Alto");
  checkItem("Centro Cirúrgico, exceto sala cirúrgica;");
  checkItem("Endoscopia;");
  checkItem("Enfermarias;");
  checkItem("Farmácia;");
  checkItem("Laboratório de microbiologia e virologia;");
  checkItem("Pediatria;");
  checkItem("Pronto Socorro;");
  checkItem("Radiologia e Setor de Imagem;");
  checkItem("Sala de emergência;");
  checkItem("Sala de pequenos procedimentos;");
  checkItem("Unidade de Recuperação Pós-Anestésica — RPA.");
  gap(2);

  subTitle("Grupo 4 — Risco Muito Alto");
  checkItem("Central de Materiais e Esterilização — CME;");
  checkItem("Diálise e Hemodiálise;");
  checkItem("Salas cirúrgicas;");
  checkItem("UTIs.");
  gap(4);

  // ============ 4. Orientações por Classe de Risco ============
  sectionTitle("4. Orientações por Classe de Risco");

  subTitle("Classe I");
  numberedList([
    "Executar trabalhos por métodos que minimizem o levantamento de poeira durante atividades de construção.",
    "Recolocar imediatamente as telhas removidas para a realização da inspeção visual.",
    "Limpar as superfícies de trabalho com desinfetante.",
  ]);
  gap(2);

  subTitle("Classe II");
  numberedList([
    "Obter autorização do SCIH antes do início da construção/obra/reforma.",
    "Criar meios de evitar a dispersão de poeira na atmosfera.",
    "Cobrir as superfícies de trabalho com névoa de água para controlar a poeira durante cortes e perfurações, como makita e furadeira.",
    "Vedar com fita as portas não utilizadas.",
    "Vedar e bloquear as passagens de ventilação.",
    "Colocar tapete úmido na entrada e saída da obra para minimizar a dispersão do pó.",
    "Remover ou isolar o sistema AVAC — aquecimento, ventilação e ar-condicionado — nas áreas onde houver intervenção.",
  ]);
  gap(2);

  subTitle("Classe III");
  numberedList([
    "Obter autorização do SCIH antes do início da construção/obra/reforma.",
    "Remover ou isolar o sistema AVAC — aquecimento, ventilação e ar-condicionado — nas áreas onde estiverem sendo executadas atividades de construção, para evitar a contaminação do sistema de dutos.",
    "Utilizar barreiras completas, do piso ao teto, com conexão selada, podendo ser de gesso, madeira compensada ou plástico rígido, para isolar outras áreas do local de trabalho antes do início da construção.",
    "Colocar tapete úmido na entrada e saída da obra para minimizar a dispersão do pó.",
  ]);
  gap(4);

  // ============ 5. Exigências Adicionais ============
  sectionTitle("5. Exigências Adicionais");
  // Campo grande para exigências adicionais
  {
    const boxH = 22;
    ensureSpace(boxH + 2);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("Exigências adicionais", MARGIN, y - 0.5);
    y += 1.5;
    pdf.setDrawColor(170);
    pdf.rect(MARGIN, y, CONTENT_W, boxH);
    y += boxH + 3;
  }
  fieldRow("Data");
  fieldRow("Iniciais");
  gap(4);

  subTitle("5.1 Exceções ou Inclusões");
  paragraph("Exceções ou inclusões a esta autorização deverão ser feitas em memorando anexo.", { italic: true });
  gap(1);
  fieldRow("Data");
  fieldRow("Iniciais");
  fieldRow("Autorizada por");
  fieldRow("Autorização aprovada por");

  // --- Rodapé com numeração ---
  const pageCount = pdf.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    pdf.setPage(p);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(
      "HGNI — Autorização do Controle de Infecções para Obras/Reformas",
      MARGIN,
      PAGE_H - 8
    );
    pdf.text(`Página ${p} de ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
    pdf.setTextColor(0);
  }

  return pdf;
}
