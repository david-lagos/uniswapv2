const { ethers } = require('ethers');
const { ChainId, Fetcher, WETH, Route } = require('@uniswap/sdk');
const GetPoolData = require('./getPoolData');
const axios = require('axios');

window.onload = function() {

    // Elements

    const connectButton = document.getElementById('connect');
    const content = document.getElementById('content');
    const account = document.getElementById('account');
    const addLiquitidyButton = document.getElementById('addLiquidity');
    const token0List = document.getElementById('token0List');
    const token0Input = document.getElementById('token0Input');

    const chainId = ChainId.RINKEBY;

    // Functions

    const connect = async() => {
        try {
            // find provider
            if(window.ethereum) {
                // send connection request to wallet
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                provider.listAccounts().then(addresses => {
                    account.innerText = addresses[0];
                });
                
                // display account information and hide connectButton
                content.style.display = '';
                connectButton.style.display = 'none';
                return provider;
            } else {
                // handler in case a web3 provider is not found
                alert('You require a web3 provider');
            }
        } catch(error) {
            // handler in case user rejects the connection request
            alert('You have rejected the request');
        }
    }

    const addLiquidity = async() => {

        // Define provider and signer
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const signerAddress = await signer.getAddress();

        // Token Addresses
        
        const token0Address = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984'; // UNI
        const token0Symbol = 'UNI';
        const token1Address = '0xc778417E063141139Fce010982780140Aa0cD5Ab'; // WETH
        const token1Symbol = 'WETH';

        const chainId = ChainId.RINKEBY;
        const token0 = await Fetcher.fetchTokenData(chainId, token0Address, undefined, token0Symbol);
        const token1 = await Fetcher.fetchTokenData(chainId, token1Address, undefined, token1Symbol);
        const pair = await Fetcher.fetchPairData(token0, token1);
        console.log(`The current reserve of ${token0.symbol} in the pool is ${parseFloat(ethers.utils.formatUnits(pair.reserve0.raw.toString(), token0.decimals)).toFixed(3)}`);
        console.log(`The current reserve of ${token1.symbol} in the pool is ${parseFloat(ethers.utils.formatUnits(pair.reserve1.raw.toString(), token1.decimals)).toFixed(3)}`);
        const route = new Route([pair], token0);
        console.log(`${route.midPrice.toSignificant(6)} ${token1.symbol} per ${token0.symbol}`);
        console.log(`${route.midPrice.invert().toSignificant(6)} ${token0.symbol} per ${token1.symbol}`);
        // console.log(pair.reserveOf(weth).toSignificant(6));

        // These interfaces allow us to approve token spend from our site and check if approval has already been granted
        const token0Contract = new ethers.Contract(
            token0Address,
            [
            'function approve(address spender, uint rawAmount) external returns (bool)',
            'function allowance(address owner, address spender) external view returns (uint)',
            'function balanceOf(address account) external view returns (uint)'
            ],
            signer
        );

        const token1Contract = new ethers.Contract(
            token1Address,
            [
            'function approve(address spender, uint rawAmount) external returns (bool)',
            'function allowance(address owner, address spender) external view returns (uint)',
            'function balanceOf(address account) external view returns (uint)'
            ],
            signer
        );

        // Allowance method
        const allowance0 = token0Contract.allowance(
            signerAddress,
            '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' // Router Address
        );

        const allowance1 = token1Contract.allowance(
            signerAddress,
            '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' // Router Address
        );

        allowance0.then(value => {
            if(value == 0){
                console.log(`You are not authorized to spend ${token0.symbol}`)
            } else {
                console.log(`You are free to spend up to ${value} ${token0.symbol}`)
            }
        });

        allowance1.then(value => {
            if(value == 0){
                console.log(`You are not authorized to spend ${token1.symbol}`)
            } else {    
                console.log(`You are free to spend up to ${value} ${token1.symbol}`)
            }
        });

        // Balance method
        const balance = await signer.getBalance();
        console.log(`Your wallet has a balance of ${parseFloat(ethers.utils.formatUnits(balance.toString(), 18)).toFixed(3)} ETH`);
        const balance0 = token0Contract.balanceOf(signerAddress);
        const balance1 = token1Contract.balanceOf(signerAddress);
        balance0.then(value => {
            console.log(`Your wallet has a balance of ${parseFloat(ethers.utils.formatUnits(value, token0.decimals)).toFixed(3)} ${token0.symbol}`);
        });
        balance1.then(value => {
            console.log(`Your wallet has a balance of ${parseFloat(ethers.utils.formatUnits(value, token1.decimals)).toFixed(3)} ${token1.symbol}`);
        });
        
        // Query the pools
        GetPoolData.getPairs().then(async(poolArray) => {

        // Query hourly data for each pool
        const arr = [];
        await Promise.all(poolArray.map(async(value) => {
            let data = await GetPoolData.getHourData(value.id);
            let sum = data.reduce((acc, val) => {
                return { hourlyVolumeUSD: parseFloat(acc['hourlyVolumeUSD']) + parseFloat(val['hourlyVolumeUSD']) };
            });
            arr.push({
                id: value.id,
                token0: value.token0.symbol,
                token1: value.token1.symbol,
                liquidity: parseFloat(value.reserveUSD),
                volume24h: sum['hourlyVolumeUSD'].toString(),
                fees24h: (sum['hourlyVolumeUSD'] * 0.003).toString(),
                //lastHour: data[0]['hourStartUnix'],
                yield: ((sum['hourlyVolumeUSD'] * 0.003) / value.reserveUSD * 36500),
                yieldPer: ((sum['hourlyVolumeUSD'] * 0.003) / value.reserveUSD * 36500).toFixed(2) + '%'
            });
        }));
        arr.sort((a,b) => {
            return b.yield - a.yield;
        });
        console.log(arr);
    });
   
        /*const routerContract = new ethers.Contract(
            '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            [
            'function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
            'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)'
            ],
            signer
        );
        
        console.log(routerContract);

        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        const signerAddress = await signer.getAddress();
        console.log(signerAddress);

        /*const swapTx = await routerContract.swapETHForExactTokens(
            "1000000000000000000",
            [weth.address, uni.address],
            signerAddress,
            deadline,
            { value: ethers.utils.parseEther('2.0'), gasLimit: 2000000 }
        );

        console.log(swapTx.hash);

        const addETH = await routerContract.addLiquidityETH(
            uni.address,
            "1500000000000000000",
            "1000000000000000000",
            "1000000000000000000",
            signerAddress,
            deadline,
            { value: ethers.utils.parseEther('2.0'), gasLimit: 2000000 }
        )

        console.log(addETH.hash);*/
    }

    const getAmount1 = async() => {
        token0Input.style.display = '';
        token1Input.style.display = '';
        let token0Address = '';
        let token0Symbol = '';
        let token1Address = '';
        let token1Symbol = '';

        const option0 = token0List.options[token0List.selectedIndex];
        const option1 = token1List.options[token1List.selectedIndex];
        
        if(option0.value == 'ETH'){
            token0Address = '0xc778417E063141139Fce010982780140Aa0cD5Ab';
            token0Symbol = 'WETH';
        } else {
            token0Address = option0.value;
            token0Symbol = option0.textContent;
        }

        if(option1.value == 'ETH'){
            token1Address = '0xc778417E063141139Fce010982780140Aa0cD5Ab';
            token1Symbol = 'WETH';
        } else {
            token1Address = option1.value;
            token1Symbol = option1.textContent;
        }


        if((token1Symbol == '') || (token0Input.value == '')){
                //Do nothing
            } else {

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const token0 = await Fetcher.fetchTokenData(chainId, token0Address, provider, token0Symbol);
            const token1 = await Fetcher.fetchTokenData(chainId, token1Address, provider, token1Symbol);
            const pair = await Fetcher.fetchPairData(token0, token1, provider);
            const route = new Route([pair], token0);
            
            token1Input.value = route.midPrice.toSignificant(6) * token0Input.value;
            
            const getPrice = async(option) => {
                if(option == 'ETH'){
                    let price = await axios.get("https://api.coingecko.com/api/v3/simple/price/", {
                        params: {
                            ids: 'ethereum',
                            vs_currencies: 'usd'
                        }
                    });
                    return price.data.ethereum.usd;
                } else {
                    let price = await GetPoolData.getPriceData(option);  
                    return parseFloat(parseFloat(price[0].priceUSD).toFixed(2));
                }
            }

            const price0 = await getPrice(option0.value);
            const price1 = await getPrice(option1.value);
            const liquidity0 = parseFloat(ethers.utils.formatUnits(pair.reserveOf(token0).raw.toString(), token0.decimals));
            const liquidity1 = parseFloat(ethers.utils.formatUnits(pair.reserveOf(token1).raw.toString(), token1.decimals));

            const myLiquidity = (parseFloat(token0Input.value) * price0) + (parseFloat(token1Input.value) * price1);
            const poolLiquidity = (liquidity0 * price0) + (liquidity1 * price1);

            console.log(myLiquidity, poolLiquidity);

            const myShare = (myLiquidity / (myLiquidity + poolLiquidity) * 100).toFixed(2);

            console.log(`Your share of the pool is ${myShare} %`);
        }
    }
    
    const getAmount0 = async() => {
        token0Input.style.display = '';
        token1Input.style.display = '';
        let token0Address = '';
        let token0Symbol = '';
        let token1Address = '';
        let token1Symbol = '';

        const option0 = token0List.options[token0List.selectedIndex];
        const option1 = token1List.options[token1List.selectedIndex];
        
        if(option0.value == 'ETH'){
            token0Address = '0xc778417E063141139Fce010982780140Aa0cD5Ab';
            token0Symbol = 'WETH';
        } else {
            token0Address = option0.value;
            token0Symbol = option0.textContent;
        }

        if(option1.value == 'ETH'){
            token1Address = '0xc778417E063141139Fce010982780140Aa0cD5Ab';
            token1Symbol = 'WETH';
        } else {
            token1Address = option1.value;
            token1Symbol = option1.textContent;
        }


        if((token0Symbol == '') || (token1Input.value == '')){
                //Do nothing
            } else {

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const token0 = await Fetcher.fetchTokenData(chainId, token0Address, provider, token0Symbol);
            const token1 = await Fetcher.fetchTokenData(chainId, token1Address, provider, token1Symbol);
            const pair = await Fetcher.fetchPairData(token0, token1, provider);
            const route = new Route([pair], token1);
            
            token0Input.value = route.midPrice.toSignificant(6) * token1Input.value;
            
            const getPrice = async(option) => {
                if(option == 'ETH'){
                    let price = await axios.get("https://api.coingecko.com/api/v3/simple/price/", {
                        params: {
                            ids: 'ethereum',
                            vs_currencies: 'usd'
                        }
                    });
                    return price.data.ethereum.usd;
                } else {
                    let price = await GetPoolData.getPriceData(option);  
                    return parseFloat(parseFloat(price[0].priceUSD).toFixed(2));
                }
            }

            const price0 = await getPrice(option0.value);
            const price1 = await getPrice(option1.value);
            const liquidity0 = parseFloat(ethers.utils.formatUnits(pair.reserveOf(token0).raw.toString(), token0.decimals));
            const liquidity1 = parseFloat(ethers.utils.formatUnits(pair.reserveOf(token1).raw.toString(), token1.decimals));

            const myLiquidity = (parseFloat(token0Input.value) * price0) + (parseFloat(token1Input.value) * price1);
            const poolLiquidity = (liquidity0 * price0) + (liquidity1 * price1);

            console.log(myLiquidity, poolLiquidity);

            const myShare = (myLiquidity / (myLiquidity + poolLiquidity) * 100).toFixed(2);

            console.log(`Your share of the pool is ${myShare} %`);
        }
    }

    // Listeners

    connectButton.addEventListener('click', connect);
    addLiquitidyButton.addEventListener('click', addLiquidity);
    token0List.addEventListener('change', getAmount1);
    token0Input.addEventListener('keyup', getAmount1);
    token1List.addEventListener('change', getAmount0);
    token1Input.addEventListener('keyup', getAmount0);
}