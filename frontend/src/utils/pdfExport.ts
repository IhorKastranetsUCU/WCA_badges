import { jsPDF } from "jspdf";
import { BadgeTemplate } from "@/types/badge";
import { Competitor, Role } from "@/types/competitor";
import { getApiUrl } from "@/api/config";

export async function exportBadges(
  template: BadgeTemplate,
  competitors: Competitor[],
  roles: Role[],
  side: "front" | "back" | "both" = "front"
): Promise<void> {
  // Try server-side ReportLab high-fidelity PDF export first
  try {
    const res = await fetch(getApiUrl("/api/badges/export-pdf"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        side,
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
      a.download = `wca_badges_${template.dimensions.preset}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
  } catch (err) {
    console.warn("Backend PDF export unavailable, falling back to client-side jsPDF:", err);
  }

  // Client-side fallback with jsPDF
  const { width_mm, height_mm } = template.dimensions;
  const orientation = width_mm > height_mm ? "landscape" : "portrait";
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: [width_mm, height_mm],
  });

  const rolesMap = new Map(roles.map((r) => [r.id, r]));
  const sidesToExport = side === "both" ? (["front", "back"] as const) : [side];

  let firstPage = true;

  competitors.forEach((comp) => {
    const compRole = comp.role_id ? rolesMap.get(comp.role_id) : roles[0];
    const roleName = compRole?.name || "Participant";

    sidesToExport.forEach((currentSide) => {
      if (!firstPage) {
        doc.addPage([width_mm, height_mm], orientation);
      }
      firstPage = false;

      // Page background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, width_mm, height_mm, "F");

      const sideDef = template.sides[currentSide];
      if (sideDef.background_url) {
        try {
          doc.addImage(
            sideDef.background_url,
            sideDef.background_url.startsWith("data:image/png") ? "PNG" : "JPEG",
            0,
            0,
            width_mm,
            height_mm,
            undefined,
            "FAST"
          );
        } catch (e) {
          console.warn("Failed to render background image in jsPDF fallback:", e);
        }
      }

      const elements = [...sideDef.elements]
        .filter((e) => e.enabled)
        .sort((a, b) => a.position.z_index - b.position.z_index);

      elements.forEach((elem) => {
        const { x_mm, y_mm, width_mm: w, height_mm: h } = elem.position;
        const style = elem.style;

        if (elem.type === "role") {
          const rStyle = compRole?.style;
          doc.setFillColor(rStyle?.background_color || "#2563EB");
          const radius = rStyle?.border_radius ? Math.min(rStyle.border_radius * 0.5, Math.min(w, h) / 2) : 2;
          doc.roundedRect(x_mm, y_mm, w, h, radius, radius, "F");
        } else if (style?.has_background) {
          doc.setFillColor(style.background_color || "#FFFFFF");
          if (style.border_radius && style.border_radius > 0) {
            const radius = Math.min(style.border_radius * 0.5, Math.min(w, h) / 2);
            doc.roundedRect(x_mm, y_mm, w, h, radius, radius, "F");
          } else {
            doc.rect(x_mm, y_mm, w, h, "F");
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
          const raw = String(comp.csv_index || 1);
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
            doc.rect(x_mm, y_mm, w, h / 2, "F");
            doc.setFillColor(255, 221, 0);
            doc.rect(x_mm, y_mm + h / 2, w, h / 2, "F");
          } else {
            doc.setFillColor(59, 130, 246);
            doc.rect(x_mm, y_mm, w, h, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.text(iso, x_mm + w / 2, y_mm + h / 2, { align: "center", baseline: "middle" });
          }
          return;
        }

        const effectiveStyle = elem.type === "role" ? compRole?.style : style;
        if (effectiveStyle && "uppercase" in effectiveStyle && effectiveStyle.uppercase) {
          text = text.toUpperCase();
        }

        const fontSizePt = (effectiveStyle?.font_size || 12) * 0.75;
        doc.setFontSize(fontSizePt);
        doc.setTextColor(effectiveStyle?.text_color || (elem.type === "role" ? "#FFFFFF" : "#111827"));

        const align = effectiveStyle?.text_align || (elem.type === "competition_id" ? "right" : "center");
        const alignOption: "left" | "center" | "right" = align;
        const pad_mm = 2.0;
        const textX = align === "center" ? x_mm + w / 2 : align === "right" ? x_mm + w - pad_mm : x_mm + pad_mm;
        const textY = y_mm + h / 2;

        doc.text(text, textX, textY, { align: alignOption, baseline: "middle" });
      });
    });
  });

  doc.save(`wca_badges_${template.dimensions.preset}.pdf`);
}
