const fs = require('fs');
const path = require('path');
const assert = require('assert-diff');
const extras = require('../lib/info-extras');


const assertURL = url => {
  assert.ok(/^https?:\/\//.test(url), `Not a URL: ${url}`);
};

const assertChannelURL = url => {
  assert.ok(/^https?:\/\/www\.youtube\.com\/channel\/[a-zA-Z0-9_-]+$/.test(url), `Not a channel URL: ${url}`);
};

const assertUserID = str => {
  assert.ok(/^[a-zA-Z0-9_-]+$/.test(str), `Not a user id: ${str}`);
};

const assertUserName = str => {
  assert.ok(/^[a-zA-Z0-9_-]+$/.test(str), `Not a username: ${str}`);
};

const assertUserURL = url => {
  assert.ok(/^https?:\/\/www\.youtube\.com\/user\/[a-zA-Z0-9_-]+$/.test(url), `Not a user URL: ${url}`);
};

describe('extras.getAuthor()', () => {
  it('Returns video author object', () => {
    const info = require('./files/videos/vevo/expected-info.json');
    const author = extras.getAuthor(info);
    assert.ok(author);
    assertURL(author.avatar);
    assertChannelURL(author.channel_url);
    assertChannelURL(author.external_channel_url);
    assertUserID(author.id);
    assertUserName(author.user);
    assert.ok(author.name);
    assertUserURL(author.user_url);
    assert.equal(typeof author.verified, 'boolean');
    assert.number(author.subscriber_count);
  });

  describe('watch page without author', () => {
    it('Returns empty object if author not found', () => {
      const info = require(
        './files/videos/regular/watch-no-extras.json');
      const author = extras.getAuthor(info);
      assert.deepEqual(author, {});
    });
  });

  describe('from a rental', () => {
    it('Returns video author object', () => {
      const info = require('./files/videos/rental/expected-info.json');
      const author = extras.getAuthor(info);
      assert.ok(author);
      assertURL(author.avatar);
      assertChannelURL(author.channel_url);
      assertChannelURL(author.external_channel_url);
      assertUserID(author.id);
      assertUserName(author.user);
      assert.ok(author.name);
      assertUserURL(author.user_url);
      assert.equal(typeof author.verified, 'boolean');
      assert.number(author.subscriber_count);
    });
  });
});


describe('extras.getMedia()', () => {
  it('Returns media object', () => {
    const info = require('./files/videos/vevo/expected-info.json');
    const media = extras.getMedia(info);
    assert.ok(media);
    assert.equal(media.artist, 'Wu-Tang Clan');
    assertChannelURL(media.artist_url);
    assert.equal(media.category, 'Music');
    assertURL(media.category_url);
  });

  describe('On a video associated with a game', () => {
    it('Returns media object', () => {
      const info = require('./files/videos/game/expected-info.json');
      const media = extras.getMedia(info);
      assert.ok(media);
      assert.equal(media.category, 'Gaming');
      assertURL(media.category_url);
      assert.equal(media.game, 'Pokémon Snap');
      assertURL(media.game_url);
      assert.equal(media.year, '1999');
    });
  });

  describe('With invalid input', () => {
    it('Should return an empty object', () => {
      const media = extras.getMedia({ invalidObject: '' });
      assert.ok(media);
      assert.deepEqual(media, {});
    });
  });
});


describe('extras.getRelatedVideos()', () => {
  it('Returns related videos', () => {
    const info = require('./files/videos/related2/expected-info.json');
    const relatedVideos = extras.getRelatedVideos(info);
    assert.ok(relatedVideos && relatedVideos.length > 0);
    for (let video of relatedVideos) {
      assert.ok(video.id);
      assert.ok(video.author);
      assert.ok(video.title);
      assert.ok(video.length_seconds);
      assertURL(video.video_thumbnail);
    }
  });

  describe('Without `rvs` params', () => {
    it('Still able to find video params', () => {
      const info = require('./files/videos/related/expected-info-no-rvs.json');
      const relatedVideos = extras.getRelatedVideos(info);
      for (let video of relatedVideos) {
        assert.ok(video.id);
        assert.ok(video.author);
        assert.ok(video.title);
        assert.ok(video.length_seconds);
        assertURL(video.video_thumbnail);
      }
    });
  });

  describe('Without `secondaryResults`', () => {
    it('Unable to find any videos', () => {
      const info = require('./files/videos/related/expected-info-no-results.json');
      const relatedVideos = extras.getRelatedVideos(info);
      assert.ok(relatedVideos);
      assert.deepEqual(relatedVideos, []);
    });
  });

  describe('With an unparseable video', () => {
    it('Catches errors', () => {
      const info = require(
        './files/videos/related/watch-bad-details.json');
      const relatedVideos = extras.getRelatedVideos(info);
      assert.deepEqual(relatedVideos, []);
    });
  });
});

describe('extras.getLikes()', () => {
  it('Returns like count', () => {
    let html = fs.readFileSync(path.resolve(__dirname,
      'files/videos/regular/watch.json'), 'utf8');
    const likes = extras.getLikes(html);
    assert.equal(typeof likes, 'number');
  });

  describe('With no likes', () => {
    it('Does not return likes', () => {
      let html = fs.readFileSync(path.resolve(__dirname,
        'files/videos/no-likes-or-dislikes/watch.json'), 'utf8');
      const likes = extras.getLikes(html);
      assert.equal(likes, null);
    });
  });
});

describe('extras.getDislikes()', () => {
  it('Returns dislike count', () => {
    let html = fs.readFileSync(path.resolve(__dirname,
      'files/videos/regular/watch.json'), 'utf8');
    const dislikes = extras.getDislikes(html);
    assert.equal(typeof dislikes, 'number');
  });

  describe('With no dislikes', () => {
    it('Does not return dislikes', () => {
      let html = fs.readFileSync(path.resolve(__dirname,
        'files/videos/no-likes-or-dislikes/watch.json'), 'utf8');
      const dislikes = extras.getDislikes(html);
      assert.equal(dislikes, null);
    });
  });
});
