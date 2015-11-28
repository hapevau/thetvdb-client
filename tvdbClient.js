var xml2js =  require('xml2js'),
	request = require('superagent'),
	sprintf=require('sprintf-js').sprintf,
	parser = new xml2js.Parser({explicitArray: false});
  
var util = {};
    util.format = sprintf;
    
var isBrowser = typeof window != 'undefined' && !(typeof process === 'object' && process + '' === '[object process]');
	
function tvdbCleaner(){	
}   

tvdbCleaner.prototype.normalizeLineBreaks = function(text){
	return text.replace(/\r\n/g, "\n");
};

tvdbCleaner.prototype.listStringToArray = function(text){  
	return text.replace(/,/g, "|").split('|').filter(function(n) {return n;});  
};

function addCorsio() {
  return isBrowser ? 'http://cors.io/?u=' : '';
}

function tvdbClient(apiKey, cleaner) {
	this.cleaner = cleaner || new  tvdbCleaner(); 
	this.baseImgUrl =  'http://thetvdb.com/banners/'; 
	this.languageUrl =  addCorsio() + 'http://thetvdb.com/api/%s/languages.xml';   
	this.mirrorUrl = addCorsio() + 'http://thetvdb.com/api/%s/mirrors.xml';   
	this.apiKey = apiKey;
	this.getAllBySeriesIdUrl = addCorsio() + 'http://thetvdb.com/api/%s/series/%s/all/de.xml';
	this.getSeriesInfoBySeriesIdUrl = addCorsio() + 'http://thetvdb.com/api/%s/series/%s/de.xml' 
	this.getByEpisodeIdUrl = addCorsio() + 'http://thetvdb.com/api/%s/episodes/%s/de.xml';  
	this.getByTitleUrl = addCorsio() + 'http://thetvdb.com/api/GetSeries.php?seriesname=%s&language=de';
	this.getBannersBySeriesIdUrl = addCorsio() + 'http://thetvdb.com/api/%s/series/%s/banners.xml';  
	this.getActorsBySeriesIdUrl = addCorsio() + 'http://thetvdb.com/api/%s/series/%s/actors.xml';
}	

tvdbClient.prototype.getById = function(template, id, cb) {
	var url = util.format(template, this.apiKey, id); 
	request.get(url).end(function(err, response){
		if(err) {
			cb(err, null);
		} else {
			parser.parseString(response.text, function(parseError, parseResult){
				if(err) {
					cb(err, null);
				} else {
					cb(null, parseResult);
				}
			})
		}
	});
};      

tvdbClient.prototype.getLanguages = function(cb){
	this.getById(this.languageUrl, '', function(err, res){
		var langs = (res && res.Languages && res.Languages.Language) ? res.Languages.Language : [],
			result = [];  
		for(var i=0, len=langs.length; i<len; i+=1) {
			result.push({
				name: langs[i].name,
				abbreviation: langs[i].abbreviation,
				id: langs[i].id
			});
		}
		cb(null, result);     
	}); 
};       

tvdbClient.prototype.getMirrors = function(cb){
	this.getById(this.mirrorUrl, '', function(err, res){   
		
		var mirrors = (res && res.Mirrors && res.Mirrors.Mirror) ? res.Mirrors.Mirror : [],
			result = [];  
		for(var i=0, len=mirrors.length; i<len; i+=1) {
			result.push({
				path: mirrors[i].mirrorpath,
				typemask: mirrors[i].typemask,
				id: mirrors[i].id
			});
		} 
		if(result.length===0) result.push({
			path: mirrors.mirrorpath,
			typemask: mirrors.typemask,
			id: mirrors.id
		});
		cb(null, result);     
	}); 
};

tvdbClient.prototype.getBannersBySeriesId = function(id, cb) { 
	self=this; 
	this.getById(this.getBannersBySeriesIdUrl, id, function(err, res){
		var banners = (res && res.Banners && res.Banners.Banner) ? res.Banners.Banner : [],
			result={};			
		for(var i=0, len=banners.length; i<len; i+=1) {
			if(!result[banners[i].BannerType]) {
				result[banners[i].BannerType] = [];
			}
			result[banners[i].BannerType].push({url: self.baseImgUrl+banners[i].BannerPath, language: banners[i].Language});
		} 
		cb(null, result);
	});
}; 

tvdbClient.prototype.getActorsBySeriesId = function(id, cb) { 
	self=this; 
	this.getById(this.getActorsBySeriesIdUrl, id, function(err, res){
		var actors = (res && res.Actors && res.Actors.Actor) ? res.Actors.Actor : [],
		 	result = [];
		for(var i=0, len=actors.length; i<len; i+=1) {
			result.push({
				name: actors[i].Name,
				role: actors[i].Role,
				id: actors[i].id,
				imageurl: self.baseImgUrl+actors[i].Image
			});
		}
		cb(null, result);
	}); 
};

tvdbClient.prototype.getAllBySeriesId = function(id, cb) {
	this.getById(this.getAllBySeriesIdUrl, id, cb);
};     

tvdbClient.prototype.getSeasonsBySeriesId = function(id, cb) {
	var seasons={}, series={}, self=this;
	this.getById(this.getAllBySeriesIdUrl, id, function(err, all){
		if(err) {
			cb(err, null);
		} else {       
			series = {
				name: all.Data.Series.SeriesName,
				id:  all.Data.Series.id,
				overview: (all.Data.Series.Overview) ? self.cleaner.normalizeLineBreaks(all.Data.Series.Overview) : '',
				actors: self.cleaner.listStringToArray(all.Data.Series.Actors),
				genre: self.cleaner.listStringToArray(all.Data.Series.Genre),
				rating: all.Data.Series.ContentRating,
				network: all.Data.Series.Network,
				language: all.Data.Series.Language,
				firstaired: all.Data.Series.FirstAired
			};
			for(var i=0, len = all.Data.Episode.length; i<len; i+=1) {
				if(!seasons[all.Data.Episode[i].SeasonNumber]){
					seasons[all.Data.Episode[i].SeasonNumber] = {
						seasonid:all.Data.Episode[i].seasonid, 
						seasonnumber: all.Data.Episode[i].SeasonNumber,
						episodes: []
					};
				} 
				seasons[all.Data.Episode[i].SeasonNumber].episodes.push( 
			    	 {
						name: all.Data.Episode[i].EpisodeName,
						number: all.Data.Episode[i].EpisodeNumber,
						id: all.Data.Episode[i].id,
						overview: (all.Data.Episode[i].Overview) ? self.cleaner.normalizeLineBreaks(all.Data.Episode[i].Overview) : '',
						directors: self.cleaner.listStringToArray(all.Data.Episode[i].Director),
						writers: self.cleaner.listStringToArray(all.Data.Episode[i].Writer),   
						firstaired: all.Data.Episode[i].FirstAired,
						imageurl: self.baseImgUrl+ all.Data.Episode[i].filename, 
						gueststars: self.cleaner.listStringToArray(all.Data.Episode[i].GuestStars),
						language: all.Data.Episode[i].Language
					 } 
			    );
			} 
			cb(null, {
				series: series, 
				seasons: seasons
			});
		}
	});
};

tvdbClient.prototype.getSeriesByTitle = function(title, cb) {
	var url = util.format(this.getByTitleUrl, title),
		series = [], 
		erg,
		self=this;  
	 request.get(url).end(function(err, response){
		if(err) {
			cb(err, null);
		} else {
			parser.parseString(response.text, function(parseError, parseResult){
				if(parseError ) {
					cb(parseError, null);
				} else {      
					erg = parseResult.Data.Series || [];
					for(var i=0, len=erg.length;i<len;i+=1)  
					{
						series.push(
							{
								name: erg[i].SeriesName,
								alias: erg[i].AliasNames || '',
								imageurl: self.baseImgUrl+erg[i].banner,
								id: erg[i].seriesid,
								language: erg[i].language,
								overview: (erg[i].Overview) ? self.cleaner.normalizeLineBreaks(erg[i].Overview) : '',
								imdbid: erg[i].IMDB_ID
							}
						);
					}
					cb(null, series);
				}
			});
		}
	});
};

tvdbClient.prototype.getSeriesInfoBySeriesId = function(id, cb) {
	this.getById(this.getSeriesInfoBySeriesIdUrl, id, cb);
}; 

tvdbClient.prototype.getEpisodeInfoByEpisodeId = function(id, cb) {
	this.getById(this.getByEpisodeIdUrl, id, cb);
};  

tvdbClient.prototype.getImageAndSave = function(url, filename, cb) {
	return null;
};          

if(isBrowser)
  window.TvDbClient = tvdbClient;
else
  module.exports.TvDbClient = tvdbClient;