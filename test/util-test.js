const ytdl   = require('..');
const util   = require('../lib/util');
const fs     = require('fs');
const path   = require('path');
const assert = require('assert-diff');


var formats = [
  { itag          : '18',
    type          : 'video/mp4; codecs="avc1.42001E, mp4a.40.2"',
    quality       : 'medium',
    container     : 'mp4',
    resolution    : '360p',
    encoding      : 'H.264',
    bitrate       : '0.5',
    audioEncoding : 'aac',
    audioBitrate  : 96 },
  { itag          : '43',
    type          : 'video/webm; codecs="vp8.0, vorbis"',
    quality       : 'medium',
    container     : 'webm',
    resolution    : '360p',
    encoding      : 'VP8',
    bitrate       : '0.5',
    audioEncoding : 'vorbis',
    audioBitrate  : 128 },
  { itag          : '133',
    type          : 'video/mp4; codecs="avc1.4d400d"',
    quality       : null,
    container     : 'mp4',
    resolution    : '240p',
    encoding      : 'H.264',
    bitrate       : '0.15-0.3',
    rtmp          : true,
    audioEncoding : null,
    audioBitrate  : null },
  { itag          : '36',
    type          : 'video/3gpp; codecs="mp4v.20.3, mp4a.40.2"',
    quality       : 'small',
    container     : '3gp',
    resolution    : '240p',
    encoding      : 'MPEG-4 Visual',
    bitrate       : '0.17',
    audioEncoding : 'aac',
    audioBitrate  : 38 },
  { itag          : '5',
    type          : 'video/x-flv',
    quality       : 'small',
    container     : 'flv',
    resolution    : '240p',
    encoding      : 'Sorenson H.283',
    bitrate       : '0.25',
    audioEncoding : 'mp3',
    audioBitrate  : 64 },
  { itag          : '160',
    type          : 'video/mp4; codecs="avc1.4d400c"',
    quality       : null,
    container     : 'mp4',
    resolution    : '144p',
    encoding      : 'H.264',
    bitrate       : '0.1',
    audioEncoding : null,
    audioBitrate  : null },
  { itag          : '17',
    type          : 'video/3gpp; codecs="mp4v.20.3, mp4a.40.2"',
    quality       : 'small',
    container     : '3gp',
    resolution    : '144p',
    encoding      : 'MPEG-4 Visual',
    bitrate       : '0.05',
    audioEncoding : 'aac',
    audioBitrate  : 24 },
  { itag          : '140',
    type          : 'audio/mp4; codecs="mp4a.40.2"',
    quality       : null,
    container     : 'mp4',
    resolution    : null,
    enoding       : null,
    bitrate       : null,
    audioEncoding : 'aac',
    audioBitrate  : 128 },
  { itag          : '139',
    type          : 'audio/mp4; codecs="mp4a.40.2"',
    quality       : null,
    container     : 'mp4',
    resolution    : null,
    enoding       : null,
    bitrate       : null,
    audioEncoding : null,
    audioBitrate  : null },
  { itag          : '138',
    type          : 'audio/mp4; codecs="mp4a.40.2"',
    quality       : null,
    container     : 'mp4',
    resolution    : null,
    enoding       : null,
    bitrate       : null,
    audioEncoding : null,
    audioBitrate  : null },
];
var getItags = function(format) { return format.itag; };


describe('util.parseTime()', function() {
  it('Returns milliseconds if given numbers', function() {
    assert.equal(1234, util.parseTime(1234));
  });

  it('Works with minutes and seconds', function() {
    assert.equal(2 * 60000 + 36 * 1000, util.parseTime('2m36s'));
  });

  it('And even only hours and milliseconds', function() {
    assert.equal(3 * 3600000 + 4200, util.parseTime('3h4200ms'));
  });
});


describe('util.sortFormats()', function() {
  describe('With `highest` given', function() {
    it('Sorts available formats from highest to lowest quality', function() {
      var sortedFormats = formats.slice();
      sortedFormats.sort(util.sortFormats);
      var itags = sortedFormats.map(getItags);
      assert.deepEqual(itags, [
        '43', '18', '5', '36', '17', '133', '160', '140', '139', '138'
      ]);
    });
  });
});


describe('util.chooseFormat', function() {
  var sortedFormats = formats.slice();
  sortedFormats.sort(util.sortFormats);

  it('Is exposed in module', function() {
    assert.equal(ytdl.chooseFormat, util.chooseFormat);
  });

  describe('with no options', function() {
    it('Chooses highest quality', function() {
      var format = util.chooseFormat(sortedFormats, {});
      assert.equal(format.itag, '43');
    });
  });

  describe('With lowest quality wanted', function() {
    it('Chooses lowest itag', function() {
      var format = util.chooseFormat(sortedFormats, { quality: 'lowest' });
      assert.equal(format.itag, '138');
    });
  });

  describe('With itag given', function() {
    it('Chooses matching format', function() {
      var format = util.chooseFormat(sortedFormats, { quality: 5 });
      assert.equal(format.itag, '5');
    });

    describe('that is not in the format list', function() {
      it('Returns an error', function() {
        var err = util.chooseFormat(sortedFormats, { quality: 42 });
        assert.equal(err.message, 'No such format found: 42');
      });
    });
  });

  describe('With list of itags given', function() {
    it('Chooses matching format', function() {
      var format = util.chooseFormat(sortedFormats, { quality: [99, 160, 18] });
      assert.equal(format.itag, '160');
    });
  });

  describe('With format object given', function() {
    it('Chooses given format without searching', function() {
      var format = util.chooseFormat(sortedFormats, { format: formats[0] });
      assert.equal(format, formats[0]);
    });
  });

  describe('With filter given', function() {
    describe('that matches a format', function() {
      it('Chooses a format', function() {
        var format = util.chooseFormat(sortedFormats, {
          filter: function(format) { return format.container === 'mp4'; }
        });
        assert.equal(format.itag, '18');
      });
    });

    describe('that does not match a format', function() {
      it('Returns an error', function() {
        var err = util.chooseFormat(sortedFormats, { filter: function() {} });
        assert.equal(err.message, 'No formats found with custom filter');
      });
    });
  });

  describe('Get an rtmp format (not supported)', function() {
    it('Returns an error', function() {
      var err = util.chooseFormat(sortedFormats, { quality: 133 });
      assert.equal(err.message, 'rtmp protocol not supported');
    });
  });
});


describe('util.filterFormats', function() {
  it('Tries to find formats that match', function() {
    var filter = function(format) { return format.container === 'mp4'; };
    var itags = util.filterFormats(formats, filter).map(getItags);
    assert.deepEqual(itags, ['18', '133', '160', '140', '139', '138']);
  });

  it('Is exposed in module', function() {
    assert.equal(ytdl.filterFormats, util.filterFormats);
  });

  describe('that doesn\'t match any format', function() {
    it('Returns an empty list', function() {
      var list = util.filterFormats(formats, function() { return false; });
      assert.equal(list.length, 0);
    });
  });

  describe('With `video` given', function() {
    it('Returns only matching formats', function() {
      var itags = util.filterFormats(formats, 'video').map(getItags);
      assert.deepEqual(itags, ['18', '43', '133', '36', '5', '160', '17']);
    });
  });

  describe('With `videoonly` given', function() {
    it('Returns only matching formats', function() {
      var itags = util.filterFormats(formats, 'videoonly').map(getItags);
      assert.deepEqual(itags, ['133', '160']);
    });
  });

  describe('With `audio` given', function() {
    it('Returns only matching formats', function() {
      var itags = util.filterFormats(formats, 'audio').map(getItags);
      assert.deepEqual(itags, ['18', '43', '36', '5', '17', '140']);
    });
  });

  describe('With `audioonly` given', function() {
    it('Returns only matching formats', function() {
      var itags = util.filterFormats(formats, 'audioonly').map(getItags);
      assert.deepEqual(itags, ['140']);
    });
  });
});


describe('util.between()', function() {
  it('`left` positioned at the start', function() {
    var rs = util.between('<b>hello there friend</b>', '<b>', '</b>');
    assert.equal(rs, 'hello there friend');
  });

  it('somewhere in the middle', function() {
    var rs = util.between('something everything nothing', ' ', ' ');
    assert.equal(rs, 'everything');
  });

  it('not found', function() {
    var rs = util.between('oh oh _where_ is it', '<b>', '</b>');
    assert.equal(rs, '');
  });

  it('`right` before `left`', function() {
    var rs = util.between('>>> a <this> and that', '<', '>');
    assert.equal(rs, 'this');
  });

  it('`right` not found', function() {
    var rs = util.between('something [around[ somewhere', '[', ']');
    assert.equal(rs, '');
  });
});


describe('util.getVideoID()', function() {
  it('Retrives the video ID from the url', function() {
    var id;
    id = util.getVideoID('http://www.youtube.com/watch?v=RAW_VIDEOID');
    assert.equal(id, 'RAW_VIDEOID');
    id = util.getVideoID('http://youtu.be/RAW_VIDEOID');
    assert.equal(id, 'RAW_VIDEOID');
    id = util.getVideoID('http://youtube.com/v/RAW_VIDEOID');
    assert.equal(id, 'RAW_VIDEOID');
    id = util.getVideoID('http://youtube.com/embed/RAW_VIDEOID');
    assert.equal(id, 'RAW_VIDEOID');
    id = util.getVideoID('RAW_VIDEOID'); // Video ids are 11-character long
    assert.equal(id, 'RAW_VIDEOID');
    id = util.getVideoID('https://www.twitch.tv/user/v/1234');
    assert.equal(id.message, 'No video id found: https://www.twitch.tv/user/v/1234');
    id = util.getVideoID('www.youtube.com');
    assert.equal(id.message, 'No video id found: www.youtube.com');
    id = util.getVideoID('http://www.youtube.com/playlist?list=1337');
    assert.equal(id.message, 'Video id (playlist) does not match expected format (/^[a-zA-Z0-9-_]{11}$/)');
  });
});

describe('util.validateLink()', function() {
  it('Retrieves whether a string includes a parsable video ID', function() {
    var id;
    id = util.validateLink('http://www.youtube.com/watch?v=RAW_VIDEOID');
    assert.equal(id, true);
    id = util.validateLink('https://www.twitch.tv/user/v/1234');
    assert.equal(id, false);
  });
});


describe('util.parseFormats()', function() {
  var info = require('./files/util/pJk0p-98Xzc_preparsed.json');
  it('Retrieves video formats from info', function() {
    var myinfo = util.objectAssign({}, info);
    var formats = util.parseFormats(myinfo);
    assert.ok(formats);
    assert.equal(formats.length, 15);
  });
});


describe('util.getVideoDescription()', function() {
  it('Retrieves formatted video description', function(done) {
    fs.readFile(path.resolve(__dirname,
    'files/util/multiline-video-description'), 'utf8', function(err, html) {
      assert.ifError(err);
      var cleanDescription = util.getVideoDescription(html);
      assert.equal(cleanDescription, 'Some Title\n' +
        'Line 1\n' +
        '"Line 2"\n' +
        '1  First Song  5:30\n' +
        '2  Second Song  5:42');
      done();
    });
  });

  it('Fallbacks to empty description if element not found', function(done) {
    fs.readFile(path.resolve(__dirname,
    'files/util/bad-watch-page'), 'utf8', function(err, html) {
      assert.ifError(err);
      var cleanDescription = util.getVideoDescription(html);
      assert.equal(cleanDescription, '');
      done();
    });
  });
});


describe('util.getAuthor()', function() {
  it('Returns video author object', function(done) {
    fs.readFile(path.resolve(__dirname, 'files/util/related-video'),
    'utf8', function(err, html) {
      assert.ifError(err);
      var authorObj = util.getAuthor(html);
      assert.deepEqual(authorObj, {
        id: 'UC_aEa8K-EOJ3D6gOs7HcyNg',
        name: 'NoCopyrightSounds',
        avatar: 'https://www.youtube.com/hisprofile.pic',
        user: 'NoCopyrightSounds',
        channel_url: 'https://www.youtube.com/channel/UC_aEa8K-EOJ3D6gOs7HcyNg',
        user_url: 'https://www.youtube.com/user/NoCopyrightSounds',
      });
      done();
    });
  });

  it('Returns empty object if author not found', function(done) {
    fs.readFile(path.resolve(__dirname,
    'files/util/bad-watch-page'), 'utf8', function(err, html) {
      assert.ifError(err);
      var authorObj = util.getAuthor(html);
      assert.deepEqual(authorObj, {});
      done();
    });
  });
});


describe('util.getPublished()', function() {
  it('Retrieves formatted published date', function(done) {
    fs.readFile(path.resolve(__dirname, 'files/util/related-video'),
    'utf8', function(err, html) {
      assert.ifError(err);
      var publishedTimestamp = util.getPublished(html);
      assert.equal(publishedTimestamp, 1416355200000);
      done();
    });
  });
});


describe('util.getRelatedVideos()', function() {
  it('Returns related videos', function(done) {
    fs.readFile(path.resolve(__dirname, 'files/util/related-video'),
    'utf8', function(err, html) {
      assert.ifError(err);
      var relatedVideos = util.getRelatedVideos(html);
      assert.deepEqual(relatedVideos, [
        {
          author: 'NoCopyrightSounds',
          iurlmq: 'iurlmq1',
          title: 'Alan Walker - Spectre [NCS Release]',
          length_seconds: '227',
          id: 'AOeY-nDp7hI',
          session_data: 'itct=secondvid',
          endscreen_autoplay_session_data: 'itct=endscreen_firstvid',
          short_view_count_text: '119 Mio. Aufrufe',
          iurlhq_webp: 'first.pic'
        },
        {
          playlist_title: 'Mix – Alan Walker - Fade [NCS Release]',
          list: 'RDbM7SZ5SBzyY',
          playlist_iurlmq: 'iurlmq2',
          session_data: 'itct=firstvid%3D%3D',
          playlist_length: '0',
          thumbnail_ids: 'AOeY-nDp7hI',
          video_id: 'AOeY-nDp7hI',
          playlist_iurlhq: 'second.pic'
        }
      ]);
      done();
    });
  });

  it('Returns empty array when error parsing', function(done) {
    fs.readFile(path.resolve(__dirname,
    'files/util/bad-watch-page'), 'utf8', function(err, html) {
      assert.ifError(err);
      var relatedVideos = util.getRelatedVideos(html);
      assert.deepEqual(relatedVideos, []);
      done();
    });
  });
});


describe('util.parallel()', function() {
  describe('Multiple asynchronous functions', function() {
    it('Calls callback with results', function(done) {
      var funcs = [];
      for (var i = 0; i < 5; i++) {
        funcs.push(function(i, callback) {
          setTimeout(function() { callback(null, i); }, ~~(Math.random() * 10));
        }.bind(null, i));
      }
      util.parallel(funcs, function(err, results) {
        assert.ifError(err);
        for (var i = 0, len = results.length; i < len; i++) {
          assert.equal(results[i], i);
        }
        done();
      });
    });

    describe('where one of them errors', function() {
      it('Gives an error', function(done) {
        var funcs = [];
        for (var i = 0; i < 5; i++) {
          funcs.push(function(i, callback) {
            setImmediate(function() {
              if (i === 0) {
                callback(new Error('Something went wrong'));
              } else {
                callback(null, i);
              }
            });
          }.bind(null, i));
        }
        util.parallel(funcs, function(err) {
          assert.ok(err);
          setImmediate(done);
        });
      });
    });
  });

  describe('Zero functions', function() {
    it('Still calls callback', function(done) {
      util.parallel([], done);
    });
  });

  describe('Functions call callback twice', function() {
    it('Only calls final callback once', function(done) {
      util.parallel([
        function(callback) { setTimeout(callback, 10); },
        function(callback) { setTimeout(callback, 10); }
      ], done);
    });
  });
});


describe('util.objectAssign()', function() {
  it('Merges object into another', function() {
    var target = { headers: { one: 1, two: 2 }, my: 'mine' };
    var source = { headers: { one: 100 } };
    util.objectAssign(target, source, true);
    assert.deepEqual(target, { headers: { one: 100, two: 2 }, my: 'mine' });
  });
});


describe('util.fromHumanTime', function() {
  it('Time format 00:00:00.000', function() {
    assert.equal(util.fromHumanTime('25.000'), 25000);
    assert.equal(util.fromHumanTime('05:30'), 60000 * 5 + 30000);
    assert.equal(util.fromHumanTime('01:05:30'), 60000 * 60 + 60000 * 5 + 30000);
    assert.equal(util.fromHumanTime('1:30.123'), 60000 + 30000 + 123);
  });

  it('Time format 0ms, 0s, 0m, 0h', function() {
    assert.equal(util.fromHumanTime('2ms'), 2);
    assert.equal(util.fromHumanTime('1m'), 60000);
    assert.equal(util.fromHumanTime('1m10s'), 60000 + 10000);
    assert.equal(util.fromHumanTime('2hm10s500ms'), 3600000 * 2 + 10000 + 500);
  });

  it('No format', function() {
    assert.equal(util.fromHumanTime('1000'), 1000);
    assert.equal(util.fromHumanTime(200), 200);
  });
});
