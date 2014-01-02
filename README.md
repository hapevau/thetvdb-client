# TheTvDB-Client  

Client (für den Eigenbedarf entwickelt), der **deutsche** Informationen von thetvdb.com bezieht und diese in Form von JSON bereitstellt.
Der Client stellt Methoden für den Zugriff auf die thetvdb.com-Api bereit. Für die Verwendung wird ein API-Key von thetvdb.com benötigt.

## Installation
	
	npm install hpv-tvdb

Das Modul verwendet request für die Aufrufe der tvdb-Api und xml2js für die Konvertierung der XML-Dateien

## Verwendung

	var tvdbc = require('hpv-tvdb'),
	    client = new tvdbc.TvDbClient(%apikey),
	    callback = function(err, result) {
		    console.log(result);
	    };
	client.getSeriesByTitle('Bones', callback); 
	// SerienId entnehmen
	client.getSeasonsBySeriesId('75682', callback);
	
%apikey = von thetvdb.com bereitgestellter API-Key

## API

Alle Aufrufe verlangen eine callback-Funktion in der Form 
`function(error, result)`

### Suche über Titel 

**Aufruf** 

getSeriesByTitle(%titel, callback)  
	
**Result** 

Array von Serieninfo-Objekten

*SerienInfo-Objekt*
     
	[ 
	   {
			name: Serienname,
			alias: Alias-Name,
			imageurl: URL zum Banner,
			id: Serien-ID,
			language: Sprache,
			overview: Serienübersicht,
			imdbid: ID auf imdb.com
	     }      
	]
### Alle Serieninformation über Serien-Id

**Aufruf** 

getSeasonsBySeriesId(%Serien-Id, callback)    

**Result** 

Ein Serienobjekt mit allen Staffeln und Episoden. Enthält alle nötigen Daten ausser den Staffelbildern. 

*Serien-Objekt* 

  	    {
	        series: {
		    	name: Serienname,
				id:  Serien-Id,
				overview: Übersicht,
				actors: [Array von Schuspielernamen],
				genre: [Array von Genres],
				rating: Einstufung,
				network: TV-Sender,
				language: Sprache,
				firstaired: Erstaustrahlung
	        },
			seasons: {
				'%Staffelnummer': {
					seasonid: ID der Staffel,
					seasonnumber: Staffelnummer,
					episodes: [
						{
							name: Titel der Episode,
							number: Nummer der Folge,
							id: ID der Episode,
							overview: Inhalt der Episode,
							directors: [Array von Regiseuren],
							writers: [Array von Drehbuchautoren],   
							firstaired: Erstausstrahlungsdatum,
							imageurl: URL zum Episodenbild, 
							gueststars: [Array von Gaststars],
							language: Sprache der Episode (de)
						}
					]
				}
			}
		}                   

%Staffelnummer = '1', '2,' ...
		
### Alle Bild-Urls einer Serie

**Aufruf**

getBannersBySeriesId(%Serien-Id, callback)

**Result**

Ein Objekt strukturiert nach Bildarten (bannertype)

	{
		'%Bildart' : [{
			url: Url zum Bild, 
			language: Sprache
		}]‚
	}          
	
Mögliche Bildarten sind: 

- fanart
- poster
- season
- series 

### Schauspielerinformationen abrufen

**Aufruf**

getActorsBySeriesId(%Serien-Id, callback)

**Result**

Array von Bildobjekten

*Bildobjekt*

	[
		{
			name: Schauspielername,
			role: Rollenname,
			id: Schauspieler-Id,
			imageurl: Url zum Bild des Schauspielers
		}
	]        
	

### Bild abrufen und speichern

**Aufruf**

getImageAndSave(url, filename, callback)

Übergeben werden die URL des Bildes (evtl. aus getBannersBySeriesId), der gewünschte Dateiname und der obligatorische callback 
	
Der Client verfügt noch über weitere Funktionen, die aber hauptsächlich intern verwendet werden. Bei Interesse einfach in die Source schauen.