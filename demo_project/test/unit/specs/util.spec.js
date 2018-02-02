var expect = chai.expect;

describe('测试numAdd函数', function() {
    it('1+1', function() {
        expect(numAdd(1, 1)).to.be.equal(2);
    });

    it('-1 + 1', function() {
        expect(numAdd(-1, -1)).to.be.equal(0);
    });
});
