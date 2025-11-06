import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GeminiService } from './services/gemini.service';

// Declare global libraries from CDN scripts
declare var html2canvas: any;
declare var jspdf: any;

@Component({
  selector: 'app-root',
  template: `
    <main class="bg-gray-100 min-h-screen p-4 sm:p-6 md:p-8 font-sans">
      <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <header class="bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
          <h1 class="text-3xl font-bold text-white tracking-tight">
            Univerzalni AI Analizator Troškova
          </h1>
          <p class="text-blue-100 mt-1">
            Analizirajte račune i ponude kako biste pronašli uštede.
          </p>
        </header>

        <div class="p-6 space-y-6">
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-colors duration-300"
               [class.border-blue-500]="isDragOver()"
               (dragover)="onDragOver($event)"
               (dragleave)="onDragLeave()"
               (drop)="onDrop($event)">
            
            <svg class="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
            
            <p class="mt-2 text-sm text-gray-600">
              <label for="file-upload" class="relative cursor-pointer rounded-md font-semibold text-blue-600 hover:text-blue-500">
                <span>Učitajte dokument</span>
                <input id="file-upload" name="file-upload" type="file" class="sr-only" (change)="onFileSelected($event)" accept="image/png, image/jpeg, image/gif, application/pdf">
              </label>
              ili ga povucite i ispustite
            </p>
            <p class="text-xs text-gray-500">PNG, JPG, GIF, PDF</p>

            @if (selectedFile()) {
              <div class="mt-4 text-sm font-medium text-gray-700 bg-gray-100 p-2 rounded-md">
                Odabrana datoteka: {{ selectedFile()?.name }}
              </div>
            }
          </div>
          
          <div class="relative">
            <div class="absolute inset-0 flex items-center" aria-hidden="true">
              <div class="w-full border-t border-gray-300"></div>
            </div>
            <div class="relative flex justify-center">
              <span class="bg-white px-3 text-base font-medium text-gray-500">ILI</span>
            </div>
          </div>

          <div>
            <label for="text-input" class="block text-sm font-medium leading-6 text-gray-900">
              Zalijepite tekstualni sadržaj
            </label>
            <div class="mt-2">
              <textarea 
                id="text-input"
                rows="8" 
                class="block w-full rounded-md border-0 p-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" 
                placeholder="Unesite ili zalijepite tekst računa ili ponude ovdje..."
                [value]="textInput()"
                (input)="onTextInputChange($event)"></textarea>
            </div>
          </div>


          <div>
            <button
              (click)="analyze()"
              [disabled]="(!selectedFile() && !textInput().trim()) || loading() || exportingPdf()"
              class="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300">
              @if (loading()) {
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Analiziram...</span>
              } @else {
                <span>Analiziraj Dokument</span>
              }
            </button>
          </div>
        </div>

        @if (error()) {
          <div class="p-6 border-t border-gray-200">
            <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
              <p class="font-bold">Greška</p>
              <p>{{ error() }}</p>
            </div>
          </div>
        }

        @if (analysis()) {
          <div class="p-6 border-t border-gray-200">
            <div class="flex justify-end mb-4">
               <button
                  (click)="exportAsPDF()"
                  [disabled]="loading() || exportingPdf()"
                  class="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200">
                  @if (exportingPdf()) {
                    <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Izvozim...</span>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Izvezi kao PDF</span>
                  }
                </button>
            </div>
            <div id="analysisResultArea">
              <div [innerHTML]="analysisHtml()"></div>
              @if (sources() && sources()!.length > 0) {
                  <div class="pt-6 mt-6 border-t border-gray-200">
                      <h3 class="text-xl font-semibold text-gray-700 mb-3">Izvori</h3>
                      <ul class="list-disc list-inside space-y-2">
                          @for (source of sources(); track $index) {
                              @if (source.web?.uri) {
                                  <li>
                                      <a [href]="source.web.uri" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">
                                          {{ source.web.title || source.web.uri }}
                                      </a>
                                  </li>
                              }
                          }
                      </ul>
                  </div>
              }
            </div>
          </div>
        }
      </div>
    </main>
  `,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly geminiService = inject(GeminiService);
  
  loading = signal(false);
  exportingPdf = signal(false);
  analysis = signal<string | null>(null);
  sources = signal<any[] | null>(null);
  error = signal<string | null>(null);
  selectedFile = signal<File | null>(null);
  textInput = signal<string>('');
  isDragOver = signal(false);

  analysisHtml = computed(() => {
    const markdown = this.analysis();
    return markdown ? this.markdownToHtml(markdown) : '';
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile.set(input.files[0]);
      this.textInput.set(''); // Clear text input
    }
  }

  onTextInputChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.textInput.set(target.value);
    if (target.value) {
      this.selectedFile.set(null); // Clear file input
    }
  }
  
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }
  
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    if (event.dataTransfer?.files[0]) {
      this.selectedFile.set(event.dataTransfer.files[0]);
      this.textInput.set(''); // Clear text input
    }
  }

  analyze(): void {
    const file = this.selectedFile();
    const text = this.textInput().trim();

    if (!file && !text) {
      this.error.set('Molimo odaberite datoteku ili unesite tekst za analizu.');
      return;
    }

    this.loading.set(true);
    this.analysis.set(null);
    this.sources.set(null);
    this.error.set(null);

    if (file) {
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        const fileDataUrl = e.target.result as string;
        try {
          const mimeTypeMatch = fileDataUrl.match(/data:(.+);base64,/);
          if (!mimeTypeMatch || !mimeTypeMatch[1]) {
            this.error.set('Nije moguće odrediti vrstu datoteke.');
            this.loading.set(false);
            return;
          }
          const mimeType = mimeTypeMatch[1];
          const base64Data = fileDataUrl.split(',')[1];
          
          const result = await this.geminiService.generateAnalysis({ 
            file: { mimeType, data: base64Data } 
          });

          this.analysis.set(result.analysisText);
          this.sources.set(result.sources);
        } catch (err: any) {
          this.error.set(err.message || 'Došlo je do nepoznate greške.');
        } finally {
          this.loading.set(false);
        }
      };
      reader.onerror = () => {
        this.error.set('Nije moguće pročitati datoteku.');
        this.loading.set(false);
      };
      reader.readAsDataURL(file);
    } else if (text) {
      (async () => {
        try {
          const result = await this.geminiService.generateAnalysis({
            textData: text,
          });
          this.analysis.set(result.analysisText);
          this.sources.set(result.sources);
        } catch (err: any) {
          this.error.set(err.message || 'Došlo je do nepoznate greške.');
        } finally {
          this.loading.set(false);
        }
      })();
    }
  }

  exportAsPDF(): void {
    const data = document.getElementById('analysisResultArea');
    if (!data) {
      console.error('Element for PDF export not found!');
      return;
    }

    this.exportingPdf.set(true);
    const supplierNameElement = data.querySelector('h2 > span');
    const supplierName = supplierNameElement?.textContent?.trim() || 'Dokumenta';
    const fileName = `Analiza-${supplierName.replace(/ /g, '_')}.pdf`;

    html2canvas(data, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      windowWidth: data.scrollWidth,
      windowHeight: data.scrollHeight,
    }).then((canvas: HTMLCanvasElement) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jspdf.jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const margin = 15; // 15mm margin on each side
      const pdfPageWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      const usableWidth = pdfPageWidth - margin * 2;
      const usableHeight = pdfPageHeight - margin * 2;

      const imgProps = pdf.getImageProperties(imgData);
      const pdfImgHeight = (imgProps.height * usableWidth) / imgProps.width;
      
      let heightLeft = pdfImgHeight;
      let position = 0;

      // Add the first page
      pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, pdfImgHeight);
      heightLeft -= usableHeight;

      // Add subsequent pages if needed
      while (heightLeft > 0) {
        position -= usableHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position + margin, usableWidth, pdfImgHeight);
        heightLeft -= usableHeight;
      }

      pdf.save(fileName);
      this.exportingPdf.set(false);
    }).catch((err: any) => {
      console.error("Error exporting PDF:", err);
      this.error.set("Došlo je do greške prilikom izvoza PDF-a.");
      this.exportingPdf.set(false);
    });
  }

  private formatText(text: string): string {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  }

  private getRatingBadge(ratingText: string): string {
    const cleanRating = ratingText.replace(/\*/g, '');
    let badgeClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    if (cleanRating.includes('Visoka')) {
      badgeClass += ' bg-red-100 text-red-800';
    } else if (cleanRating.includes('Poštena')) {
      badgeClass += ' bg-yellow-100 text-yellow-800';
    } else if (cleanRating.includes('Dobra')) {
      badgeClass += ' bg-green-100 text-green-800';
    } else {
      return this.formatText(ratingText);
    }

    return `<span class="${badgeClass}">${this.formatText(ratingText)}</span>`;
  }

  private markdownToHtml(markdown: string): string {
    let html = '';
    const lines = markdown.split('\n');
    let inTableBody = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (trimmedLine.startsWith('|')) {
        const cells = trimmedLine.split('|').map(c => c.trim()).slice(1, -1);
        if (cells.length === 0) continue;

        if (trimmedLine.includes(':---')) {
          html += '<tbody class="bg-white divide-y divide-gray-200">';
          inTableBody = true;
        } else if (inTableBody) {
          const ratingText = cells[3] || '';
          const isGoodRating = ratingText.includes('Dobra');
          const rowClass = isGoodRating ? 'line-through text-gray-500' : 'text-black';

          html += `<tr class="${rowClass}">`;
          html += `<td class="px-4 py-4 whitespace-nowrap text-sm">${this.formatText(cells[0])}</td>`;
          html += `<td class="px-4 py-4 whitespace-nowrap text-sm text-center">${this.formatText(cells[1])}</td>`;
          html += `<td class="px-4 py-4 whitespace-nowrap text-sm text-center">${this.formatText(cells[2])}</td>`;
          html += `<td class="px-4 py-4 whitespace-nowrap text-sm text-center">${this.getRatingBadge(ratingText)}</td>`;
          html += `<td class="px-4 py-4 text-sm">${this.formatText(cells[4] || '')}</td>`;
          html += '</tr>';
        } else {
          html += '<div class="overflow-x-auto rounded-lg border border-gray-200 mt-4"><table class="min-w-full divide-y divide-gray-200">';
          html += '<thead class="bg-gray-50"><tr>';
          cells.forEach(header => {
            html += `<th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${header}</th>`;
          });
          html += '</tr></thead>';
        }
      } else {
        if (inTableBody) {
          html += '</tbody></table></div>';
          inTableBody = false;
        }

        if (trimmedLine.startsWith('# Analiza Dokumenta:')) {
          const title = trimmedLine.replace('# Analiza Dokumenta:', '').trim();
          html += `<h2 class="text-2xl font-semibold text-gray-800 mb-4">Analiza Dokumenta: <span class="font-bold">${title}</span></h2>`;
        } else if (trimmedLine.startsWith('### ')) {
          html += `<h3 class="text-xl font-semibold text-gray-700 mt-6 mb-3">${trimmedLine.substring(4)}</h3>`;
        } else if (trimmedLine.startsWith('---')) {
          html += '<hr class="my-6 border-gray-200">';
        } else if (trimmedLine.startsWith('* **')) {
          const boldPart = trimmedLine.match(/\*\s\*\*(.*?):\*\*/);
          if (boldPart) {
            const content = trimmedLine.substring(boldPart[0].length).trim();
            html += `<p class="text-gray-600"><strong class="font-medium text-gray-900">${boldPart[1]}:</strong> ${content}</p>`;
          }
        } else {
          html += `<p class="text-gray-600 mt-4">${this.formatText(trimmedLine)}</p>`;
        }
      }
    }

    if (inTableBody) {
      html += '</tbody></table></div>';
    }

    return html;
  }
}
