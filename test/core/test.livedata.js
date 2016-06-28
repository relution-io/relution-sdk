describe('Relution', function () {

  it('Relution.version', function () {
    assert.ok(Relution.version && Relution.hasOwnProperty('version'), 'Relution.version is defined');
    assert.ok(typeof Relution.version === 'string', 'Relution.version is a string');
  });

  it('Relution.livedata', function () {
    assert.ok(Relution.livedata, 'Relution.livedata is defined.');
    assert.valueOf(Relution.livedata, 'object', 'Relution.livedata is an object.');
  });

  it('locale storage', function () {

    var putSomethingToTheLocaleStorage = function () {
      Relution.livedata.Application = Relution.livedata.Application || {};
      Relution.livedata.Application.name = Relution.livedata.Application.name || 'test';
      localStorage.setItem('test0', 'test0');
      localStorage.setItem('test1', 'test1');
      localStorage.setItem(Relution.livedata.LOCAL_STORAGE_PREFIX + Relution.livedata.Application.name + Relution.livedata.LOCAL_STORAGE_SUFFIX + 'test0', Relution.livedata.LOCAL_STORAGE_PREFIX + Relution.livedata.Application.name + Relution.livedata.LOCAL_STORAGE_SUFFIX + 'test0');
      localStorage.setItem(Relution.livedata.LOCAL_STORAGE_PREFIX + Relution.livedata.Application.name + Relution.livedata.LOCAL_STORAGE_SUFFIX + 'test1', Relution.livedata.LOCAL_STORAGE_PREFIX + Relution.livedata.Application.name + Relution.livedata.LOCAL_STORAGE_SUFFIX + 'test1');
    };

    assert.ok(window && window.localStorage, 'localStorage available');
    putSomethingToTheLocaleStorage();
    localStorage.clear('f');
    assert.equal(localStorage.length, 0, 'localStorage is available and the clear function works with the parameter "f"');

    putSomethingToTheLocaleStorage();
    localStorage.clear();
    assert.equal(localStorage.length, 0, 'localStorage.clear() is implemented as anticipated in the spec');

  });

});
