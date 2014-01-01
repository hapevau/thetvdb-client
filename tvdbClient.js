var xml2js =  require('xml2js'),
	request = require('request'),
	util=require('util'),
	parser = new xml2js.Parser({explicitArray: false}),
	fs = require('fs'), 
	path = require("path");    
	
function tvdbCleaner(){	
}   

tvdbCleaner.prototype.normalizeLineBreaks = function(text){
	return text.replace(/\r\n/g, "\n");
};

tvdbCleaner.prototype.listStringToArray = function(text){  
	return text.replace(/,/g, "|").split('|').filter(function(n) {return n;});  
};

function tvdbClient(apiKey, cleaner) {
	this.cleaner = cleaner || new  tvdbCleaner(); 
	this.baseImgUrl =  'http://thetvdb.com/banners/'; 
	this.languageUrl = 'http://thetvdb.com/api/%s/languages.xml';   
	this.mirrorUrl = 'http://thetvdb.com/api/%s/mirrors.xml';   
	this.apiKey = apiKey;
	this.getAllBySeriesIdUrl = 'http://thetvdb.com/api/%s/series/%s/all/de.xml';
	this.getSeriesInfoBySeriesIdUrl = 'http://thetvdb.com/api/%s/series/%s/de.xml' 
	this.getByEpisodeIdUrl = 'http://thetvdb.com/api/%s/episodes/%s/de.xml';  
	this.getByTitleUrl ='http://thetvdb.com/api/GetSeries.php?seriesname=%s&language=de';
	this.getBannersBySeriesIdUrl = 'http://thetvdb.com/api/%s/series/%s/banners.xml';  
	this.getActorsBySeriesIdUrl = 'http://thetvdb.com/api/%s/series/%s/actors.xml';
}	

tvdbClient.prototype.getById = function(template, id, cb) {
	var url = util.format(template, this.apiKey, id); 
	request.get(url, function(err, response, body){
		if(err) {
			cb(err, null);
		} else {
			parser.parseString(body, function(parseError, parseResult){
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
				overview: self.cleaner.normalizeLineBreaks(all.Data.Series.Overview),
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
						overview: self.cleaner.normalizeLineBreaks(all.Data.Episode[i].Overview),
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
		self=this;  
	 request.get(url, function(err, response, body){
		if(err) {
			cb(err, null);
		} else {
			parser.parseString(body, function(parseError, parseResult){
				if(err) {
					cb(err, null);
				} else { 
					for(var i=0, len=parseResult.Data.Series.length;i<len;i+=1)  
					{
						series.push(
							{
								name: parseResult.Data.Series[i].SeriesName,
								alias: parseResult.Data.Series[i].AliasNames || '',
								imageurl: self.baseImgUrl+parseResult.Data.Series[i].banner,
								id: parseResult.Data.Series[i].seriesid,
								language: parseResult.Data.Series[i].language,
								overview: self.cleaner.normalizeLineBreaks(parseResult.Data.Series[i].Overview),
								imdbid: parseResult.Data.Series[i].IMDB_ID
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

tvdbClient.prototype.getImageAndSave = function(url, filename, cb){
	var fd,
		requestSettings = {
			method: 'GET',
		    url: url, 
			encoding: null
	};
	request(requestSettings, function(err, resp, body){
	    if(err) {
			cb(err, null);
	    } else {                           
			fd =  fs.openSync(filename, 'w');
			fs.write(fd, body, 0, body.length, 0, function(err, written){
              	if(err) {
	            	cb(err, null);
				} else {
					cb(null, {written: written});
				}
		    });
		}
	});
};          

module.exports.TvDbClient = tvdbClient;