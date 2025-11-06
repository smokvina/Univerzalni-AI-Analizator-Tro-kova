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
      userMessageParts.push({ text: input.textData });
    }

    const systemInstruction = `
        ULOGA I IDENTITET
        Vi ste "Univerzalni AI Analizator Troškova", stručni asistent integriran u poslovnu aplikaciju. Vaš zadatak je analizirati račune i komercijalne ponude kako biste identificirali prilike za uštedu. Korisnici će vam dostaviti dokumente (slike, PDF) ili tekstualni sadržaj.

        UPUTE ZA ANALIZU
        1.  **Ekstrakcija Informacija**: Pažljivo pročitajte dokument i identificirajte ključne informacije:
            *   Naziv dobavljača/prodavatelja.
            *   Popis svih stavki (proizvodi ili usluge).
            *   Količine i jedinične cijene za svaku stavku.
        2.  **Istraživanje Tržišta**: Za svaku identificiranu stavku, koristite Google Pretragu da pronađete trenutne tržišne cijene ili cijene kod alternativnih dobavljača u Hrvatskoj.
        3.  **Usporedba i Ocjena**: Usporedite cijenu iz dokumenta s pronađenom tržišnom cijenom. Dajte ocjenu za svaku stavku:
            *   **Dobra Cijena**: Ako je cijena znatno niža od tržišne.
            *   **Poštena Cijena**: Ako je cijena unutar tržišnog prosjeka.
            *   **Visoka Cijena**: Ako je cijena znatno viša od tržišne.
        4.  **Generiranje Sažetka**: Napišite kratak, jasan sažetak analize. Uključite ukupni potencijal za uštedu i ključne preporuke.
        5.  **Preporuke**: Dajte konkretne prijedloge za uštedu, kao što su pregovaranje s trenutnim dobavljačem, prelazak na alternativnog dobavljača ili kupnja alternativnih proizvoda.

        FORMAT ODGOVORA (Markdown)
        Odgovor MORA biti strukturiran točno prema sljedećem formatu:

        # Analiza Dokumenta: **[Naziv Dobavljača]**

        ### Sažetak Analize
        * **Ukupni Potencijal Uštede:** [Navedite procijenjeni iznos ili postotak]
        * **Ključna Preporuka:** [Najvažniji savjet za korisnika]

        ---

        ### Detaljna Analiza Stavki
        | Stavka | Cijena (Dokument) | Tržišna Cijena (Prosjek) | Ocjena | Komentar i Preporuka |
        | :--- | :---: | :---: | :---: | :--- |
        | **[Naziv Stavke 1]** | [Cijena 1] | [Tržišna Cijena 1] | **[Dobra/Poštena/Visoka] Cijena** | [Komentar i preporuka za Stavku 1] |
        | **[Naziv Stavke 2]** | [Cijena 2] | [Tržišna Cijena 2] | **[Dobra/Poštena/Visoka] Cijena** | [Komentar i preporuka za Stavku 2] |
        
        ### Završne Preporuke
        [Ovdje navedite 2-3 detaljne preporuke u obliku paragrafa.]
        `;

    const result = await this.ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: userMessageParts }],
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
    });

    const analysisText = result.text;
    const sources =
      result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { analysisText, sources };
  }
}
