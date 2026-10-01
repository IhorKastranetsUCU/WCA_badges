import { jsPDF } from "jspdf";
import { BadgeTemplate } from "@/types/badge";
import { Competitor, Role } from "@/types/competitor";
import { getApiUrl } from "@/api/config";

export interface ExportPdfOptions {
  paper_size?: "A4" | "A5" | "Letter" | "Legal" | "Single";
  side?: "front" | "back" | "both";
  parity?: "front_even" | "front_odd";
  crop_marks?: boolean;
}

const PAPER_SIZES: Record<string, [number, number]> = {
  A4: [210.0, 297.0],
  A5: [148.0, 210.0],
  Letter: [215.9, 279.4],
  Legal: [215.9, 355.6],
};

export async function exportBadges(
  template: BadgeTemplate,
  competitors: Competitor[],
  roles: Role[],
  options: ExportPdfOptions = {}
): Promise<void> {
  const {
    paper_size = "A4",
    side = "both",
    parity = "front_even",
    crop_marks = true,
  } = options;

  // Try server-side ReportLab high-fidelity PDF export first
  try {
    const res = await fetch(getApiUrl("/api/badges/export-pdf"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        side,
        paper_size,
        parity,
        crop_marks,
        template_override: {
          dimensions: template.dimensions,
          sides: template.sides,
        },
        competitors,
        roles,
      }),
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wca_badges_${paper_size}_${side}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
  } catch (err) {
    console.warn("Backend PDF export unavailable, falling back to client-side jsPDF:", err);
  }

  // Client-side fallback with jsPDF
  const { width_mm: badge_w, height_mm: badge_h } = template.dimensions;
  const is_single = paper_size === "Single";
  const [sheet_w, sheet_h] = is_single
    ? [badge_w, badge_h]
    : PAPER_SIZES[paper_size] || [210.0, 297.0];

  const orientation = sheet_w > sheet_h ? "landscape" : "portrait";
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: [sheet_w, sheet_h],
  });

  const rolesMap = new Map(roles.map((r) => [r.id, r]));

  // Grid calculation to minimize waste
  const edge_margin = is_single ? 0 : 5.0;
  const avail_w = is_single ? badge_w : Math.max(10, sheet_w - 2 * edge_margin);
  const avail_h = is_single ? badge_h : Math.max(10, sheet_h - 2 * edge_margin);

  const cols = is_single ? 1 : Math.max(1, Math.floor(avail_w / badge_w));
  const rows = is_single ? 1 : Math.max(1, Math.floor(avail_h / badge_h));
  const badges_per_sheet = cols * rows;

  const total_grid_w = cols * badge_w;
  const total_grid_h = rows * badge_h;
  const margin_x = is_single ? 0 : (sheet_w - total_grid_w) / 2.0;
  const margin_y = is_single ? 0 : (sheet_h - total_grid_h) / 2.0;

  let firstPage = true;

  const drawBadge = (
    comp: Competitor,
    currentSide: "front" | "back",
    origin_x: number,
    origin_y: number
  ) => {
    const compRole = comp.role_id ? rolesMap.get(comp.role_id) : roles[0];
    const roleName = compRole?.name || "Participant";

    // Badge background fill
    doc.setFillColor(255, 255, 255);
    doc.rect(origin_x, origin_y, badge_w, badge_h, "F");

    const sideDef = template.sides[currentSide];
    const elements = [...sideDef.elements]
      .filter((e) => e.enabled)
      .sort((a, b) => a.position.z_index - b.position.z_index);

    elements.forEach((elem) => {
      const { x_mm, y_mm, width_mm: w, height_mm: h } = elem.position;
      const pt_x = origin_x + x_mm;
      const pt_y = origin_y + y_mm;
      const style = elem.style;

      if (elem.type === "role") {
        const rStyle = compRole?.style;
        doc.setFillColor(rStyle?.background_color || "#2563EB");
        const radius = rStyle?.border_radius ? Math.min(rStyle.border_radius * 0.5, Math.min(w, h) / 2) : 2;
        doc.roundedRect(pt_x, pt_y, w, h, radius, radius, "F");
      } else if (style?.has_background) {
        doc.setFillColor(style.background_color || "#FFFFFF");
        if (style.border_radius && style.border_radius > 0) {
          const radius = Math.min(style.border_radius * 0.5, Math.min(w, h) / 2);
          doc.roundedRect(pt_x, pt_y, w, h, radius, radius, "F");
        } else {
          doc.rect(pt_x, pt_y, w, h, "F");
        }
      }

      let text = "";
      if (elem.type === "name") {
        if (elem.name_display === "local_only" && comp.name_local) {
          text = comp.name_local;
        } else if (elem.name_display === "both" && comp.name_local) {
          text = `${comp.name_latin} (${comp.name_local})`;
        } else {
          text = comp.name_latin;
        }
      } else if (elem.type === "wca_id") {
        const raw = comp.wca_id || "Newcomer";
        if (elem.format_mode === "prefix_label") {
          text = `WCA ID: ${raw}`;
        } else if (elem.format_mode === "custom") {
          text = `${elem.format_prefix || ""}${raw}${elem.format_suffix || ""}`;
        } else {
          text = raw;
        }
      } else if (elem.type === "competition_id") {
        const raw = String(comp.registrant_id ?? comp.csv_index ?? 1);
        if (elem.format_mode === "prefix_label") {
          text = `ID: ${raw}`;
        } else if (elem.format_mode === "custom") {
          text = `${elem.format_prefix || ""}${raw}${elem.format_suffix || ""}`;
        } else {
          text = raw;
        }
      } else if (elem.type === "role") {
        text = roleName;
      } else if (elem.type === "flag") {
        const iso = (comp.country_iso2 || "UA").toUpperCase();
        if (iso === "UA") {
          doc.setFillColor(0, 87, 183);
          doc.rect(pt_x, pt_y, w, h / 2, "F");
          doc.setFillColor(255, 221, 0);
          doc.rect(pt_x, pt_y + h / 2, w, h / 2, "F");
        } else {
          doc.setFillColor(59, 130, 246);
          doc.rect(pt_x, pt_y, w, h, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.text(iso, pt_x + w / 2, pt_y + h / 2, { align: "center", baseline: "middle" });
        }
        return;
      } else if (elem.type === "qr_code") {
        doc.setDrawColor(203, 213, 225);
        doc.rect(pt_x, pt_y, w, h, "S");
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(6);
        doc.text(elem.qr_label || "QR CODE", pt_x + w / 2, pt_y + h / 2, { align: "center", baseline: "middle" });
        return;
      } else if (elem.type === "schedule") {
        doc.setDrawColor(203, 213, 225);
        doc.rect(pt_x, pt_y, w, h, "S");
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(7);
        doc.text("SCHEDULE GRID", pt_x + w / 2, pt_y + 4, { align: "center" });
        return;
      }

      if (style?.uppercase) {
        text = text.toUpperCase();
      }

      const fontSize = elem.type === "role" ? compRole?.style.font_size || 12 : style?.font_size || 14;
      doc.setFontSize(fontSize);

      const textColor = (elem.type === "role" ? compRole?.style.text_color : style?.text_color) || "#111827";
      const hex = textColor.replace("#", "");
      if (hex.length === 6) {
        doc.setTextColor(
          parseInt(hex.substring(0, 2), 16),
          parseInt(hex.substring(2, 4), 16),
          parseInt(hex.substring(4, 6), 16)
        );
      }

      const textAlign = (elem.type === "role" ? compRole?.style.text_align : style?.text_align) || "center";
      let textX = pt_x + w / 2;
      let alignOpt: "center" | "left" | "right" = "center";
      if (textAlign === "left") {
        textX = pt_x + 2;
        alignOpt = "left";
      } else if (textAlign === "right") {
        textX = pt_x + w - 2;
        alignOpt = "right";
      }

      const textY = pt_y + h / 2;
      doc.text(text, textX, textY, { align: alignOpt, baseline: "middle" });
    });

    if (crop_marks && !is_single) {
      doc.setDrawColor(148, 163, 184);
      doc.setLineDashPattern([2, 2], 0);
      doc.rect(origin_x, origin_y, badge_w, badge_h, "S");
      doc.setLineDashPattern([], 0);
    }
  };

  for (let i = 0; i < competitors.length; i += badges_per_sheet) {
    const chunk = competitors.slice(i, i + badges_per_sheet);

    const renderSheet = (targetSide: "front" | "back") => {
      if (!firstPage) {
        doc.addPage([sheet_w, sheet_h], orientation);
      }
      firstPage = false;

      // Sheet background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, sheet_w, sheet_h, "F");

      chunk.forEach((comp, idx) => {
        let col = idx % cols;
        const row = Math.floor(idx / cols);

        // Mirror column on back side for duplex flipping
        if (targetSide === "back" && !is_single) {
          col = cols - 1 - col;
        }

        const ox = margin_x + col * badge_w;
        const oy = margin_y + row * badge_h;
        drawBadge(comp, targetSide, ox, oy);
      });
    };

    if (side === "both") {
      if (parity === "front_even") {
        // Back on odd (Page 1), Front on even (Page 2)
        renderSheet("back");
        renderSheet("front");
      } else {
        // Front on odd (Page 1), Back on even (Page 2)
        renderSheet("front");
        renderSheet("back");
      }
    } else {
      renderSheet(side);
    }
  }

  doc.save(`wca_badges_${paper_size}_${side}.pdf`);
}
