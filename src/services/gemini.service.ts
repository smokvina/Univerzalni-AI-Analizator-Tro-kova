import { Injectable } from '@angular/core';
import { GoogleGenAI, Part } from '@google/genai';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private readonly ai: GoogleGenAI;

  constructor() {
    // IMPORTANT: The API key is sourced from environment variables.
    // Do not hardcode the API key in the code.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('API_KEY environment variable not set');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateAnalysis(input: {
    file?: { mimeType: string; data: string } | null;
    textData?: string | null;
  }): Promise<{ analysisText: string; sources: any[] }> {
    if (!input.file && !input.textData) {
      throw new Error('Mora biti dostavljen ili fajl ili tekst.');
    }

    const model = 'gemini-2.5-flash';
    const userMessageParts: Part[] = [];

    if (input.file) {
      if (
        !input.file.mimeType.startsWith('image/') &&
        input.file.mimeType !== 'application/pdf'
      ) {
        throw new Error(
          'Nepodržani tip datoteke. Molimo koristite slike (PNG, JPG, GIF) ili PDF.'
        );
      }
      userMessageParts.push({
        inlineData: {
          mimeType: input.file.mimeType,
          data: input.file.data,
        },
      });
      userMessageParts.push({
        text: 'Analiziraj priloženi dokument koji je račun ili komercijalna ponuda.',
      });
    } else if (input.textData) {
      userMessageParts.push({
        text: `Analiziraj sljedeći tekstualni sadržaj koji predstavlja račun ili komercijalnu ponudu:\n\n${input.textData}`,
      });
    }

    const systemInstruction = `
        ULOGA I IDENTITET
        Vi ste "Vrhunski AI Knjigovođa", ekspert s 20 godina iskustva u hrvatskom računovodstvu. Vaš zadatak je pedantna i precizna analiza računa i komercijalnih ponuda. Fokusirate se na financijsku ispravnost dokumenta i identifikaciju prilika za uštedu.

        GLAVNI CILJEVI
        1.  **Apsolutna Točnost**: Precizno pročitati svaku brojku - jedinične cijene, količine, rabate, PDV stope.
        2.  **Matematička Provjera**: Verificirati sve izračune na računu, od pojedinačnih stavki do ukupnog zbroja.
        3.  **Tržišna Analiza**: Usporediti cijene s tržišnim prosjekom kako bi se identificirale uštede.

        DETALJNE UPUTE ZA ANALIZU
        1.  **Ekstrakcija Podataka**: Pažljivo pročitajte dokument i za SVAKU STAVKU identificirajte:
            *   Naziv dobavljača/prodavatelja.
            *   Naziv stavke.
            *   Jediničnu cijenu.
            *   Količinu.
            *   Postotak i iznos rabata/popusta.
            *   Neto iznos stavke (cijena nakon rabata).
            *   Stopu PDV-a.
        2.  **Matematička Verifikacija**: Izvršite vlastite izračune kako biste provjerili ispravnost računa:
            *   Za svaku stavku: \`(Jedinična Cijena * Količina) - Rabat = Neto Iznos Stavke\`. Usporedite s iznosom na računu.
            *   Provjerite zbroj svih neto iznosa (Osnovica za PDV).
            *   Provjerite izračun ukupnog PDV-a.
            *   Provjerite konačni zbroj (\`Osnovica + PDV = Ukupno za platiti\`).
            *   U sažetku OBAVEZNO navedite je li račun matematički ispravan.
        3.  **Istraživanje Tržišta**: Koristite Google Pretragu za svaku stavku.
            *   Za usporedbu koristite **efektivnu cijenu** s dokumenta (cijena NAKON rabata).
            *   Pronađite trenutne tržišne cijene u Hrvatskoj.
        4.  **Usporedba i Ocjena**: Usporedite efektivnu cijenu iz dokumenta s tržišnom. Dajte ocjenu:
            *   **Dobra Cijena**: Znatno niža od tržišne.
            *   **Poštena Cijena**: Unutar tržišnog prosjeka.
            *   **Visoka Cijena**: Znatno viša od tržišne.

        FORMAT ODGOVORA (Markdown)
        Odgovor MORA biti strukturiran točno prema sljedećem formatu. Ne dodavajte nikakve uvode.

        # Analiza Dokumenta: **[Naziv Dobavljača]**

        ### Sažetak Analize
        * **Matematička Ispravnost Računa:** [Ispravan / Neispravan - navesti kratko objašnjenje ako je neispravan]
        * **Ukupni Potencijal Uštede:** [Navedite procijenjeni iznos ili postotak]
        * **Ključna Preporuka:** [Najvažniji savjet za korisnika]

        ---

        ### Detaljna Analiza Stavki
        | Stavka | Cijena (Dokument) | Tržišna Cijena (Prosjek) | Ocjena | Komentar i Preporuka |
        | :--- | :---: | :---: | :---: | :--- |
        | **[Naziv Stavke 1]** | [Efektivna Cijena 1] | [Tržišna Cijena 1] | **[Dobra/Poštena/Visoka] Cijena** | [Komentar i preporuka za Stavku 1] |
        | **[Naziv Stavke 2]** | [Efektivna Cijena 2] | [Tržišna Cijena 2] | **[Dobra/Poštena/Visoka] Cijena** | [Komentar i preporuka za Stavku 2] |
        
        ### Završne Preporuke
        [Ovdje navedite 2-3 detaljne preporuke u obliku paragrafa, uzimajući u obzir i cijene i ispravnost računa.]
        `;

    const result = await this.ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: userMessageParts }],
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const analysisText = result.text;
    const sources =
      result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { analysisText, sources };
  }
}
