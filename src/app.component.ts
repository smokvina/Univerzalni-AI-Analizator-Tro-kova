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
                <input id="file-upload" name="file-upload" type="file" class="sr-only" (change)="onFileSelected($event)" accept="image/png, image/jpeg, image/gif, application/pdf, image/heic, image/heif, .txt, .csv, text/plain, text/csv">
              </label>
              ili ga povucite i ispustite
            </p>
            <p class="text-xs text-gray-500">PNG, JPG, PDF, HEIC, TXT, CSV</p>

            @if (selectedFile()) {
              <div class="mt-4 text-sm font-medium text-gray-700">
                <div class="bg-gray-100 p-3 rounded-lg space-y-2">
                  <p class="truncate">Odabrana datoteka: <span class="font-semibold">{{ selectedFile()?.name }}</span></p>
                  
                  @if (uploadProgress() !== null && !uploadSuccess()) {
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                      <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" [style.width.%]="uploadProgress()"></div>
                    </div>
                  }
                  
                  @if (uploadSuccess()) {
                    <div class="flex items-center text-green-600">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                      <span class="text-sm font-medium">Datoteka spremna za analizu.</span>
                    </div>
                  }
                </div>
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
              [disabled]="(!selectedFileDataUrl() && !textInput().trim()) || loading() || exportingPdf()"
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
  uploadProgress = signal<number | null>(null);
  uploadSuccess = signal<boolean>(false);
  selectedFileDataUrl = signal<string | null>(null);

  analysisHtml = computed(() => {
    const markdown = this.analysis();
    return markdown ? this.markdownToHtml(markdown) : '';
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processFile(input.files[0]);
    }
  }

  onTextInputChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.textInput.set(target.value);
    if (target.value) {
      this.selectedFile.set(null); // Clear file input
      this.selectedFileDataUrl.set(null);
      this.uploadProgress.set(null);
      this.uploadSuccess.set(false);
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
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  private processFile(file: File): void {
    // Reset state
    this.selectedFile.set(file);
    this.textInput.set(''); 
    this.uploadProgress.set(0);
    this.uploadSuccess.set(false);
    this.selectedFileDataUrl.set(null);
    this.analysis.set(null);
    this.sources.set(null);
    this.error.set(null);

    const reader = new FileReader();

    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    const isImageOrPdf = fileType.startsWith('image/') || fileType === 'application/pdf';
    const isTextBased = fileType === 'text/plain' || fileType === 'text/csv' || fileName.endsWith('.txt') || fileName.endsWith('.csv');

    reader.onerror = () => {
      this.error.set('Nije moguće pročitati datoteku.');
      this.uploadProgress.set(null);
      this.uploadSuccess.set(false);
      this.selectedFile.set(null);
    };
    
    reader.onprogress = (event: ProgressEvent) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        this.uploadProgress.set(progress);
      }
    };

    if (isImageOrPdf) {
      reader.onload = (e: any) => {
        this.uploadProgress.set(100);
        this.uploadSuccess.set(true);
        this.selectedFileDataUrl.set(e.target.result as string);
      };
      reader.readAsDataURL(file);
    } else if (isTextBased) {
      reader.onload = (e: any) => {
        this.uploadProgress.set(100);
        this.uploadSuccess.set(true);
        this.textInput.set(e.target.result as string);
        this.selectedFileDataUrl.set(null); // Make sure it uses text path for analysis
      };
      reader.readAsText(file);
    } else {
      // For unsupported types like Word, Excel, etc.
      this.error.set('Format datoteke nije podržan za izravnu analizu. Molimo koristite slike, PDF, TXT, CSV ili ručno kopirajte sadržaj.');
      this.selectedFile.set(null);
      this.uploadProgress.set(null);
    }
  }

  analyze(): void {
    const fileDataUrl = this.selectedFileDataUrl();
    const text = this.textInput().trim();

    if (!fileDataUrl && !text) {
      this.error.set('Molimo odaberite datoteku ili unesite tekst za analizu.');
      return;
    }

    this.loading.set(true);
    this.analysis.set(null);
    this.sources.set(null);
    this.error.set(null);

    (async () => {
      try {
        let result;
        if (fileDataUrl) {
          const mimeTypeMatch = fileDataUrl.match(/data:(.+);base64,/);
          if (!mimeTypeMatch || !mimeTypeMatch[1]) {
            throw new Error('Nije moguće odrediti vrstu datoteke.');
          }
          const mimeType = mimeTypeMatch[1];
          const base64Data = fileDataUrl.split(',')[1];
          
          result = await this.geminiService.generateAnalysis({ 
            file: { mimeType, data: base64Data } 
          });
        } else { // text must be present
          result = await this.geminiService.generateAnalysis({
            textData: text,
          });
        }
        
        this.analysis.set(result.analysisText);
        this.sources.set(result.sources);

      } catch (err: any) {
        this.error.set(err.message || 'Došlo je do nepoznate greške.');
      } finally {
        this.loading.set(false);
      }
    })();
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

  private getRatingInfo(ratingText: string): { text: string; className: string; iconSvg: string; borderColor: string; } {
    const cleanRating = ratingText.replace(/\*/g, '').trim();
    
    // Default values
    let info = {
      text: this.formatText(ratingText),
      className: 'bg-gray-100 text-gray-800',
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9.043c.337-1.12 1.43-2.043 2.772-2.043s2.435.923 2.772 2.043m-5.544 0a8.955 8.955 0 00-2.062 0M17.3 9.043a8.955 8.955 0 01-2.062 0m0 0a2.5 2.5 0 11-5.544 0m5.544 0h.01" /></svg>`,
      borderColor: 'border-gray-400'
    };
  
    if (cleanRating.includes('Visoka')) {
      info.className = 'bg-red-100 text-red-800';
      info.iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
      info.borderColor = 'border-red-500';
    } else if (cleanRating.includes('Poštena')) {
      info.className = 'bg-yellow-100 text-yellow-800';
      info.iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>`;
      info.borderColor = 'border-yellow-500';
    } else if (cleanRating.includes('Dobra')) {
      info.className = 'bg-green-100 text-green-800';
      info.iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
      info.borderColor = 'border-green-500';
    }
    
    info.text = this.formatText(ratingText);
    return info;
  }

  private markdownToHtml(markdown: string): string {
    let html = '';
    const lines = markdown.split('\n').filter(line => line.trim() !== '');

    let inItemsList = false;
    let inSummary = false;

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine.startsWith('|') && inItemsList) {
            html += '</div>'; // Close item grid
            inItemsList = false;
        }
        if ((trimmedLine.startsWith('###') || trimmedLine.startsWith('---')) && inSummary) {
            html += '</div></div>'; // Close summary content and container
            inSummary = false;
        }
        
        if (trimmedLine.startsWith('# Analiza Dokumenta:')) {
            const title = trimmedLine.replace('# Analiza Dokumenta:', '').trim();
            html += `<h2 class="text-2xl font-semibold text-gray-800 mb-4">Analiza Dokumenta: <span class="font-bold text-blue-600">${title}</span></h2>`;
        } else if (trimmedLine.startsWith('### Sažetak Analize')) {
            inSummary = true;
            html += `<div class="p-6 bg-gray-50 rounded-lg"><h3 class="text-xl font-semibold text-gray-700 mb-4">${trimmedLine.substring(4)}</h3><div class="space-y-2">`;
        } else if (trimmedLine.startsWith('### Detaljna Analiza Stavki')) {
            html += `<h3 class="text-xl font-semibold text-gray-700 mt-8 mb-4">${trimmedLine.substring(4)}</h3>`;
        } else if (trimmedLine.startsWith('### Završne Preporuke')) {
            html += `<h3 class="text-xl font-semibold text-gray-700 mt-8 mb-4">${trimmedLine.substring(4)}</h3>`;
        } else if (trimmedLine.startsWith('---')) {
            // Separator is handled by div logic
        } else if (trimmedLine.startsWith('* **')) {
            const boldPart = trimmedLine.match(/\*\s\*\*(.*?):\*\*/);
            if (boldPart) {
                const content = trimmedLine.substring(boldPart[0].length).trim();
                html += `<p class="text-gray-700"><strong class="font-medium text-gray-900">${boldPart[1]}:</strong> ${this.formatText(content)}</p>`;
            }
        } else if (trimmedLine.startsWith('|')) {
            const cells = trimmedLine.split('|').map(c => c.trim()).slice(1, -1);
            if (cells.length === 0) continue;

            if (trimmedLine.includes(':---') && !inItemsList) {
                inItemsList = true;
                html += '<div class="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">';
            } else if (inItemsList) {
                const [itemName, docPrice, marketPrice, ratingText, comment] = cells;
                const ratingInfo = this.getRatingInfo(ratingText || '');
                const isGoodPrice = (ratingText || '').includes('Dobra');

                html += `
                  <div class="flex flex-col rounded-xl border bg-white shadow-sm transition-all hover:shadow-lg ${ratingInfo.borderColor} border-l-4">
                    <div class="p-5 flex-grow">
                      <h4 class="text-lg font-semibold ${isGoodPrice ? 'text-gray-400 line-through' : 'text-gray-800'}">${this.formatText(itemName)}</h4>
                      
                      <div class="mt-4 space-y-2 text-sm">
                        <div class="flex justify-between items-center">
                          <span class="text-gray-500">Ponuđena cijena:</span>
                          <span class="font-medium text-lg ${isGoodPrice ? 'text-gray-400' : 'text-gray-900'}">${this.formatText(docPrice)}</span>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-gray-500">Tržišni prosjek:</span>
                          <span class="font-medium text-lg text-gray-900">${this.formatText(marketPrice)}</span>
                        </div>
                      </div>
                      
                      ${comment ? `<p class="mt-4 text-sm text-gray-600 border-t pt-3">${this.formatText(comment)}</p>` : ''}
                    </div>
                    <div class="bg-gray-50 p-3 rounded-b-xl mt-auto">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${ratingInfo.className}">
                          ${ratingInfo.iconSvg}
                          ${ratingInfo.text}
                        </span>
                    </div>
                  </div>
                `;
            }
        } else {
            html += `<p class="text-gray-600 leading-relaxed">${this.formatText(trimmedLine)}</p>`;
        }
    }

    if (inItemsList) {
        html += '</div>';
    }
    if (inSummary) {
        html += '</div></div>';
    }

    return html;
  }
}
