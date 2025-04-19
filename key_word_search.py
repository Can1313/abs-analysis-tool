import os

def get_directory_structure(start_path, exclude_extensions=None):
    """
    Dizin yapısını emoji ve ağaç yapısı şeklinde gösterir
    """
    if exclude_extensions is None:
        exclude_extensions = []
    
    result = []
    
    for root, dirs, files in os.walk(start_path):
        level = root.replace(start_path, '').count(os.sep)
        indent = '  ' * level
        folder_name = os.path.basename(root)
        
        if level == 0:
            result.append(f"📦{folder_name}")
        else:
            result.append(f"{indent}┣ 📂{folder_name}")
        
        subindent = '  ' * (level + 1)
        for file in files:
            if any(file.endswith(ext) for ext in exclude_extensions):
                continue
            result.append(f"{subindent}┣ 📜{file}")
    
    return result

def search_files_for_keyword(directory, keyword, exclude_extensions=None):
    """
    Belirtilen dizindeki dosyaları tarar ve anahtar kelimeyi içeren dosyaları bulur
    """
    if exclude_extensions is None:
        exclude_extensions = []
    
    results = []
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if any(file.endswith(ext) for ext in exclude_extensions):
                continue
            
            file_path = os.path.join(root, file)
            relative_path = os.path.relpath(file_path, os.path.dirname(directory))
            
            try:
                with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
                    if keyword.lower() in content.lower():
                        results.append((relative_path, content))
            except Exception as e:
                print(f"Dosya okunamadı: {file_path} - Hata: {str(e)}")
    
    return results

if __name__ == "__main__":
    # Frontend ve backend dizinleri
    frontend_dizini = "C:\\Users\\cande\\Desktop\\abs-analysis-tool\\frontend\\src"
    backend_dizini = "C:\\Users\\cande\\Desktop\\abs-analysis-tool\\backend"
    
    # Aranacak anahtar kelimeyi buraya girin
    anahtar_kelime = input("Aramak istediğiniz anahtar kelimeyi girin: ")
    
    # Sonuçların yazılacağı dosya
    cikti_dosyasi = f"C:\\Users\\cande\\Desktop\\abs-analysis-tool\\arama_sonuclari_{anahtar_kelime}.txt"
    
    # PYC dosyalarını hariç tut
    haric_tutulan_uzantilar = [".pyc"]
    
    # Anahtar kelimeyi içeren dosyaları bul
    print(f"'{anahtar_kelime}' anahtar kelimesi için arama yapılıyor...")
    
    frontend_results = search_files_for_keyword(frontend_dizini, anahtar_kelime)
    backend_results = search_files_for_keyword(backend_dizini, anahtar_kelime, haric_tutulan_uzantilar)
    
    # Sonuçları dosyaya yaz
    with open(cikti_dosyasi, 'w', encoding='utf-8') as f:
        f.write(f"'{anahtar_kelime}' ANAHTAR KELİMESİ İÇİN ARAMA SONUÇLARI\n")
        f.write("="*70 + "\n\n")
        
        # Frontend sonuçları
        f.write("FRONTEND SONUÇLARI:\n")
        f.write("==================\n\n")
        
        if frontend_results:
            for path, content in frontend_results:
                f.write(f"DOSYA: {path}\n")
                f.write("="*50 + "\n")
                f.write(content)
                f.write("\n\n" + "="*70 + "\n\n")
        else:
            f.write("Frontend dosyalarında anahtar kelime bulunamadı.\n\n")
        
        # Backend sonuçları
        f.write("\n\nBACKEND SONUÇLARI:\n")
        f.write("================\n\n")
        
        if backend_results:
            for path, content in backend_results:
                f.write(f"DOSYA: {path}\n")
                f.write("="*50 + "\n")
                f.write(content)
                f.write("\n\n" + "="*70 + "\n\n")
        else:
            f.write("Backend dosyalarında anahtar kelime bulunamadı.\n\n")
    
    # Sonuç sayılarını yazdır
    toplam_dosya = len(frontend_results) + len(backend_results)
    print(f"Arama tamamlandı. Toplam {toplam_dosya} dosyada '{anahtar_kelime}' anahtar kelimesi bulundu.")
    print(f"Sonuçlar '{cikti_dosyasi}' dosyasına yazıldı.")