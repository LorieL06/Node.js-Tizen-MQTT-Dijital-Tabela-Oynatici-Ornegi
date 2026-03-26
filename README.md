## Nodejs TizenLG Digital Signage Player Case

Bu proje Tizen öncelikli olmak üzere LG WebOS benzeri ortamlarda çalışabilecek bir signage player akışını göstermek için hazırlanmıştır Amaç sadece çalıştırmak değil aynı zamanda mantıklı sürdürülebilir ve test edilebilir bir yapı kurmaktır Odak noktaları ise playlist verisini çekmek doğrulamak oynatmak MQTT üzerinden gelen komutları düzgün işlemek offline durumlarda sistemi ayakta tutmak ve tüm bunları modüler bir yapı içinde çözmektir

## 1 Kapsam

Minimum olarak aşağıdaki gereksinimler ele alınmıştır

- Uzak bir kaynaktan playlist verisi çekme JSON
- Görsel ve video içeriklerini sırayla oynatma
- Sürekli döngü yani loop davranışı
- MQTT üzerinden command topic dinleme
- reloadplaylist restartplayer play pause setvolume screenshot komutlarını destekleme
- correlationId kullanarak commandresult dönme
- Aynı komut tekrar gelirse idempotent şekilde davranma
- İnternet yoksa cache fallback ile devam edebilme

## 2 Proje Yapısı

Kod tarafı bilinçli olarak parçalara ayrılmıştır

- src core domain tarafında veri tipleri ve şema doğrulama bulunur
- src services içinde iş mantığı özellikle oynatmaListesiDeposu yer alır
- src network tarafında retry ve backoff mekanizması ile jsonCek fonksiyonu vardır
- src storage farklı ortamlara uygun key value depolarını içerir
- src mqtt komut yapısı şema ve transport katmanını kapsar
- src player engine oynatıcı motorunun bulunduğu yerdir
- src platform Tizen tarayıcı ve mock adaptörlerini içerir
- src infrastructure logging gibi altyapı bileşenlerini barındırır

## 3 Kurulum

Gereksinim olarak Nodejs LTS önerilir

Kurulum oldukça basit

npm install

Kalite kontrolleri için

npm run typecheck
npm run lint
npm test

Tizen için build almak adına

npm run buildtizen

Çıktı olarak disttv/girisjs dosyası oluşur

## 4 MQTT Tasarımı

Topic yapısı şu şekilde kurgulanmıştır

- Subscribe playersdeviceIdcommands
- Publish playersdeviceIdevents

Bazı önemli seçimler

- QoS 1 atleastonce tercih edildi
- Validation işlemleri src/mqtt/komutSemalari.ts içinde yapılır
- Idempotency için correlationId TTL cache tutulur
- Bağlantı koparsa src/mqtt/MqttJsTasiyici.ts üzerinden reconnect backoff çalışır

Örnek komut

command screenshot
correlationId abc123
timestamp 1700000000

Örnek sonuç

type commandresult
command screenshot
correlationId abc123
status success
payload
format imagepng
base64 BASE64IMAGEDATA

## 5 OfflineFirst Stratejisi

Sistem internet yokken de çalışacak şekilde tasarlanmıştır

- Playlist şema doğrulama src/core/domain/playlist/oynatmaListesiSemasi.ts
- Cache ve hash kontrolü src/services/playlist/oynatmaListesiDeposu.ts
- Storage tarafında ortama göre seçim yapılır
- Node için DosyaAnahtarDegerDeposu
- Tizen browser için TarayiciAnahtarDegerDeposu
- Network hatası olursa cache fallback devreye girer

## 6 Tizen Emulator Çalıştırma

Adımlar sade şekilde ilerler

1 Tizen Studio içinde TV Web App oluşturulur
2 configxml dosyasına internet izinleri eklenir
- httptizenorgprivilegeinternet
- access origin
- allownavigation http https
3 SignagePlayer indexhtml içine jsgirisjs eklenir
4 disttv/girisjs dosyası SignagePlayer jsgirisjs olarak kopyalanır
5 Run As Tizen Web Application ile çalıştırılır

Ekranda görülebilecek durumlar

- Running mqttok bağlantı var
- Running mqttoff bağlantı yok ama sistem çalışıyor
- Running mqttoff mockon resultsn mock akış doğrulanmış

## 7 Emulator Kısıtı ve Mock Mode

Bazı emulator ortamlarında websocket bağlantısı çalışmayabilir Bu durumda sistem tamamen durmaz mock mode ile devam eder ve commandresult yapısının doğru çalıştığı gösterilir Bu aslında case beklentileri ile uyumlu bir tercih

## 8 Testler

Unit testler aşağıdaki dosyalarda bulunur

- src/__tests__/oynatmaListesiDeposu.test.ts
- src/__tests__/komutIsleyici.test.ts
- src/__tests__/oynaticiMotoru.test.ts

## 9 Tradeoff ve Varsayımlar

Bazı gerçekler kabul edilmiştir

- MQTT broker testi emulator networküne bağlı olabilir
- Gerekirse mock mode ile doğrulama yapılır
- Screenshot komutu platform izin vermezse mock base64 döner