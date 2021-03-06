/* eslint-disable prefer-const */
/* global contract artifacts web3 before it assert */

const Diamond = artifacts.require('Diamond')
const DiamondLoupeFacet = artifacts.require('DiamondLoupeFacet')
const DiamondFacet = artifacts.require('DiamondFacet')
const Test1Facet = artifacts.require('Test1Facet')
const Test2Facet = artifacts.require('Test2Facet')

contract('DiamondTest', async accounts => {
  let diamondFacet
  let diamondLoupeFacet
  let diamond
  let test1Facet
  let test2Facet

  let removeSelectors
  let result
  let addresses

  let zeroAddress = '0x0000000000000000000000000000000000000000'

  before(async () => {
    test1Facet = await Test1Facet.deployed()
    test2Facet = await Test2Facet.deployed()
    diamond = await Diamond.deployed()
    diamondLoupeFacet = new web3.eth.Contract(DiamondLoupeFacet.abi, diamond.address)
    diamondFacet = new web3.eth.Contract(DiamondFacet.abi, diamond.address)

    web3.eth.defaultAccount = accounts[0]
  })

  it('should have four facets', async () => {
    result = await diamondLoupeFacet.methods.facetAddresses().call()
    addresses = result.slice(2).match(/.{40}/g).map(address => web3.utils.toChecksumAddress(address))
    assert.equal(addresses.length, 4)
  })

  it('facets should have the right function selectors', async () => {
    result = await diamondLoupeFacet.methods.facetFunctionSelectors(addresses[0]).call()
    assert.equal(result, '0x7c696fea')
    result = await diamondLoupeFacet.methods.facetFunctionSelectors(addresses[1]).call()
    assert.equal(result, '0xadfca15e7a0ed627cdffacc652ef6b2c')
    result = await diamondLoupeFacet.methods.facetFunctionSelectors(addresses[2]).call()
    assert.equal(result, '0xf2fde38b8da5cb5b')
    result = await diamondLoupeFacet.methods.facetFunctionSelectors(addresses[3]).call()
    assert.equal(result, '0x01ffc9a7')
  })

  it('selectors should be associated to facets correctly', async () => {
    assert.equal(addresses[0], await diamondLoupeFacet.methods.facetAddress('0x7c696fea').call())
    assert.equal(addresses[1], await diamondLoupeFacet.methods.facetAddress('0xcdffacc6').call())
    assert.equal(addresses[2], await diamondLoupeFacet.methods.facetAddress('0xf2fde38b').call())
    assert.equal(addresses[3], await diamondLoupeFacet.methods.facetAddress('0x01ffc9a7').call())
  })

  it('should get all the facets and function selectors of the diamond', async () => {
    result = await diamondLoupeFacet.methods.facets().call()

    assert.equal(addresses[0], web3.utils.toChecksumAddress(result[0].slice(0, 42)))
    assert.equal(result[0].slice(42), '7c696fea')

    assert.equal(addresses[1], web3.utils.toChecksumAddress(result[1].slice(0, 42)))
    assert.equal(result[1].slice(42), 'adfca15e7a0ed627cdffacc652ef6b2c')

    assert.equal(addresses[2], web3.utils.toChecksumAddress(result[2].slice(0, 42)))
    assert.equal(result[2].slice(42), 'f2fde38b8da5cb5b')

    assert.equal(addresses[3], web3.utils.toChecksumAddress(result[3].slice(0, 42)))
    assert.equal(result[3].slice(42), '01ffc9a7')

    assert.equal(result.length, 4)
  })

  function getSelectors (contract) {
    const selectors = contract.abi.reduce((acc, val) => {
      if (val.type === 'function') {
        return acc + val.signature.slice(2)
      } else {
        return acc
      }
    }, '')
    return selectors
  }

  it('should add test1 functions', async () => {
    let selectors = getSelectors(test1Facet)
    addresses.push(test1Facet.address)
    result = await diamondFacet.methods.diamondCut([test1Facet.address + selectors], zeroAddress, '0x').send({ from: web3.eth.defaultAccount, gas: 1000000 })
    result = await diamondLoupeFacet.methods.facetFunctionSelectors(addresses[4]).call()
    const frontSelector = selectors.slice(-8)
    selectors = '0x' + frontSelector + selectors.slice(0, -8)
    assert.equal(result, selectors)
  })

  it('should add test2 functions', async () => {
    const selectors = getSelectors(test2Facet)
    addresses.push(test2Facet.address)
    result = await diamondFacet.methods.diamondCut([test2Facet.address + selectors], zeroAddress, '0x').send({ from: web3.eth.defaultAccount, gas: 1000000 })
    result = await diamondLoupeFacet.methods.facetFunctionSelectors(addresses[5]).call()
    assert.equal(result, '0x' + selectors)
  })

  it('should remove some test2 functions', async () => {
    let selectors = getSelectors(test2Facet)
    removeSelectors = selectors.slice(0, 8) + selectors.slice(32, 48) + selectors.slice(-16)
    result = await diamondFacet.methods.diamondCut([zeroAddress + removeSelectors], zeroAddress, '0x').send({ from: web3.eth.defaultAccount, gas: 1000000 })
    result = await diamondLoupeFacet.methods.facetFunctionSelectors(addresses[5]).call()
    selectors = selectors.slice(-40, -32) + selectors.slice(8, 32) + selectors.slice(-32, -16) + selectors.slice(48, -40)
    assert.equal(result, '0x' + selectors)
  })

  it('should remove some test1 functions', async () => {
    let selectors = getSelectors(test1Facet)
    const frontSelector = selectors.slice(-8)
    selectors = frontSelector + selectors.slice(0, -8)

    removeSelectors = selectors.slice(8, 16) + selectors.slice(64, 80)
    result = await diamondFacet.methods.diamondCut([zeroAddress + removeSelectors], zeroAddress, '0x').send({ from: web3.eth.defaultAccount, gas: 1000000 })
    result = await diamondLoupeFacet.methods.facetFunctionSelectors(addresses[4]).call()
    selectors = selectors.slice(0, 8) + selectors.slice(16, 64) + selectors.slice(80)
    assert.equal(result, '0x' + selectors)
  })
})
