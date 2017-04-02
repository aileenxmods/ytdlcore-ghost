var assert      = require('assert');
var path        = require('path');
var fs          = require('fs');
var streamEqual = require('stream-equal');
var nock        = require('./nock');
var ytdl        = require('..');


describe('Download video', function() {
  var id = '_HSylqgVYQI';
  var video = path.resolve(__dirname, 'files/videos/' + id + '/video.flv');
  var filter = function(format) { return format.container === 'mp4'; };
  var testInfo = require('./files/videos/pJk0p-98Xzc/expected_info.json');

  beforeEach(function() {
    ytdl.cache.reset();
  });

  it('Should be pipeable and data equal to stored file', function(done) {
    var scope = nock(id, {
      dashmpd: true,
      get_video_info: true,
      player: 'player-en_US-vflV3n15C',
    });
    var stream = ytdl(id, { filter: filter });

    stream.on('info', function(info, format) {
      scope.urlReplyWithFile(format.url, 200, video);
    });

    var filestream = fs.createReadStream(video);
    streamEqual(filestream, stream, function(err, equal) {
      assert.ifError(err);
      scope.done();
      assert.ok(equal);
      done();
    });
  });

  describe('that redirects', function() {
    it('Should download file after redirect', function(done) {
      var scope = nock(id, {
        dashmpd: true,
        get_video_info: true,
        player: 'player-en_US-vflV3n15C',
      });
      var stream = ytdl(id, { filter: filter });

      stream.on('info', function(info, format) {
        scope.urlReply(format.url, 302, '', {
          Location: 'http://somehost.com/somefile.mp4'
        });
        scope.urlReplyWithFile('http://somehost.com/somefile.mp4', 200, video);
      });

      var filestream = fs.createReadStream(video);
      streamEqual(filestream, stream, function(err, equal) {
        assert.ifError(err);
        scope.done();
        assert.ok(equal);
        done();
      });
    });

    describe('too many times', function() {
      it('Emits error after 3 retries', function(done) {
        var id = '_HSylqgVYQI';
        var scope = nock(id, {
          dashmpd: true,
          get_video_info: true,
          player: 'player-en_US-vflV3n15C',
        });
        var stream = ytdl(id);
        stream.on('info', function(info, format) {
          scope.urlReply(format.url, 302, '', {
            Location: 'http://somehost.com/redirect1.mp4'
          });
          scope.urlReply('http://somehost.com/redirect1.mp4', 302, '', {
            Location: 'http://somehost.com/redirect2.mp4'
          });
          scope.urlReply('http://somehost.com/redirect2.mp4', 302, '', {
            Location: 'http://somehost.com/redirect3.mp4'
          });
        });

        stream.on('error', function(err) {
          assert.ok(err);
          scope.done();
          assert.equal(err.message, 'Too many redirects');
          done();
        });
      });
    });
  });

  describe('destroy stream', function() {
    describe('immediately', function() {
      it('Doesn\'t start the download', function(done) {
        var scope = nock(id, {
          dashmpd: true,
          get_video_info: true,
          player: 'player-en_US-vflV3n15C',
        });
        var stream = ytdl(id, { filter: filter });
        stream.destroy();

        stream.on('request', function() {
          done(new Error('Should not emit `request`'));
        });
        stream.on('response', function() {
          done(new Error('Should not emit `response`'));
        });
        stream.on('info', function() {
          scope.done();
          done();
        });
      });
    });

    describe('right after request is made', function() {
      it('Doesn\'t start the download', function(done) {
        var scope = nock(id, {
          dashmpd: true,
          get_video_info: true,
          player: 'player-en_US-vflV3n15C',
        });
        var stream = ytdl(id, { filter: filter });

        stream.on('request', function() {
          stream.destroy();
          scope.done();
          done();
        });
        stream.on('response', function() {
          done(new Error('Should not emit `response`'));
        });
      });
    });

    describe('after download has started', function() {
      it('Download is incomplete', function(done) {
        var scope = nock(id, {
          dashmpd: true,
          get_video_info: true,
          player: 'player-en_US-vflV3n15C',
        });
        var stream = ytdl(id, { filter: filter });

        stream.on('info', function(info, format) {
          scope.urlReplyWithFile(format.url, 200, video);
        });

        stream.on('response', function(res) {
          stream.destroy();
          res.on('data', function() {
            done(new Error('Should not emit `data`'));
          });
        });

        stream.on('abort', done);
      });
    });
  });

  describe('stream disconnects before end', function() {
    var filesize;
    before(function(done) {
      fs.stat(video, function(err, stat) {
        if (err) return done(err);
        filesize = stat.size;
        done();
      });
    });

    function destroy(req, res) {
      req.abort();
      res.unpipe();
      res.emit('end');
    }

    it('Still downloads the whole video', function(done) {
      var scope = nock(id, {
        dashmpd: true,
        get_video_info: true,
        player: 'player-en_US-vflV3n15C',
      });
      var stream = ytdl(id);

      var destroyedTimes = 0;
      stream.on('info', function(info, format) {
        var req, res;
        scope.urlReplyFn(format.url, function() {
          req = this.req;
          return [
            200,
            fs.createReadStream(video),
            { 'content-length': filesize }
          ];
        });

        stream.once('response', function(a) { res = a; });

        stream.on('progress', function(chunkLength, downloaded, total) {
          if (downloaded / total >= 0.5) {
            var newUrl = format.url + '&range=' + downloaded + '-';
            scope.urlReplyFn(newUrl, function() {
              return [
                200,
                fs.createReadStream(video, { start: downloaded }),
                { 'content-length': filesize - downloaded }
              ];
            });
            stream.removeAllListeners('progress');
            destroyedTimes++;
            destroy(req, res);
          }
        });
      });

      var filestream = fs.createReadStream(video);
      streamEqual(filestream, stream, function(err, equal) {
        assert.ifError(err);
        scope.done();
        assert.equal(destroyedTimes, 1);
        assert.ok(equal);
        done();
      });
    });

    describe('with range', function() {
      it('Downloads from the given `start` to `end`', function(done) {
        var scope = nock(id, {
          dashmpd: true,
          get_video_info: true,
          player: 'player-en_US-vflV3n15C',
        });

        var start = Math.floor(filesize * 0.1);
        var end = Math.floor(filesize * 0.45);
        var rangedSize = end - start + 1;
        var stream = ytdl(id, { range: { start: start, end: end } });

        var destroyedTimes = 0;
        stream.on('info', function(info, format) {
          var req, res;
          var url = format.url + '&range=' + start + '-' + end;
          scope.urlReplyFn(url, function() {
            req = this.req;
            return [
              200,
              fs.createReadStream(video, { start: start, end: end }),
              { 'content-length': rangedSize }
            ];
          });

          stream.once('response', function(a) { res = a; });

          stream.on('progress', function(chunkLength, downloaded, total) {
            if (downloaded / total >= 0.5) {
              var newUrl = format.url +
                '&range=' + (start + downloaded) + '-' + end;
              scope.urlReplyFn(newUrl, function() {
                return [
                  200,
                  fs.createReadStream(video, {
                    start: start + downloaded,
                    end: end,
                  }),
                  { 'content-length': rangedSize - downloaded }
                ];
              });
              destroyedTimes++;
              stream.removeAllListeners('progress');
              destroy(req, res);
            }
          });
        });

        var filestream = fs.createReadStream(video, { start: start, end: end });
        streamEqual(filestream, stream, function(err, equal) {
          assert.ifError(err);
          scope.done();
          assert.equal(destroyedTimes, 1);
          assert.ok(equal);
          done();
        });
      });
    });

    describe('Stream keeps disconnecting', function() {
      it('Too many reconnects', function(done) {
        var scope = nock(id, {
          dashmpd: true,
          get_video_info: true,
          player: 'player-en_US-vflV3n15C',
        });
        var stream = ytdl(id);

        var destroyedTimes = 0;
        stream.on('info', function(info, format) {
          var req, res;
          scope.urlReplyFn(format.url, function() {
            req = this.req;
            return [
              200,
              fs.createReadStream(video),
              { 'content-length': filesize }
            ];
          });

          stream.on('response', function(a) { res = a; });

          stream.on('progress', function(chunkLength, downloaded) {
            // Keep disconnecting.
            if (++destroyedTimes < 5) {
              var newUrl = format.url + '&range=' + downloaded + '-';
              scope.urlReplyFn(newUrl, function() {
                return [
                  200,
                  fs.createReadStream(video, { start: downloaded }),
                  { 'content-length': filesize - downloaded }
                ];
              });
            }
            destroy(req, res);
          });
        });

        stream.on('end', function() {
          throw new Error('Stream should not end');
        });

        stream.on('error', function(err) {
          scope.done();
          assert.ok(err);
          assert.equal(err.message, 'Too many reconnects');
          assert.equal(destroyedTimes, 5);
          done();
        });
      });
    });
  });

  describe('with range', function() {
    it('Range added to download URL', function(done) {
      var stream = ytdl.downloadFromInfo(testInfo, { range: {start: 500, end: 1000} });
      stream.on('info', function(info, format) {
        nock.url(format.url + '&range=500-1000').reply(200, '', {'content-length': '0'});
      });
      stream.resume();
      stream.on('error', done);
      stream.on('end', done);
    });
  });

  describe('with begin', function() {
    it('Begin added to download URL', function(done) {
      var stream = ytdl.downloadFromInfo(testInfo, { begin: '1m' });
      stream.on('info', function(info, format) {
        nock.url(format.url + '&begin=60000').reply(200, '');
      });
      stream.resume();
      stream.on('error', done);
      stream.on('end', done);
    });
  });

  describe('with a bad filter', function() {
    it('Emits error', function(done) {
      var stream = ytdl.downloadFromInfo(testInfo, {
        filter: function() {}
      });
      stream.on('error', function(err) {
        assert.ok(err);
        assert.ok(/No formats found/.test(err.message));
        done();
      });
    });
  });
});
