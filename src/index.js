const { ethers } = require('ethers');
const { ChainId, Fetcher, WETH, Route } = require('@uniswap/sdk');
const GetPoolData = require('./getPoolData');

window.onload = function() {

    // Elements

    const connectButton = document.getElementById('connect');
    const content = document.getElementById('content');
    const account = document.getElementById('account');
    const addLiquitidyButton = document.getElementById('addLiquidity');

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
        
        const uniAddress = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';
        //const wethAddress = '0xc778417E063141139Fce010982780140Aa0cD5Ab';

        const chainId = ChainId.RINKEBY;
        const uni = await Fetcher.fetchTokenData(chainId, uniAddress);
        const weth = WETH[chainId];
        const pair = await Fetcher.fetchPairData(uni, weth);
        const route = new Route([pair], weth);
        //console.log(route.midPrice.toSignificant(6));
        //console.log(route.midPrice.invert().toSignificant(6));
        console.log(pair.reserveOf(weth).toSignificant(6));

        // This interface allows us to approve token spend from our site and check if approval has already been granted
        const tokenContract = new ethers.Contract(
            uniAddress,
            [
            'function approve(address spender, uint rawAmount) external returns (bool)',
            'function allowance(address owner, address spender) external view returns (uint)',
            'function balanceOf(address account) external view returns (uint)'
            ],
            signer
        );

        // Allowance method
        const allowance = tokenContract.allowance(
            signerAddress,
            '0xE592427A0AEce92De3Edee1F18E0157C05861564'
        );

        allowance.then(value => console.log(value.toString()));

        // Balance method
        const balance = tokenContract.balanceOf(signerAddress);

        balance.then(value => console.log(value.toString()));

        const arrPairs = await GetPoolData.getPairs();
        
        console.log(arrPairs);

        const arr = [];
        await Promise.all(arrPairs.map(async(value) => {
            let data = await GetPoolData.getHourData(value.id);
            let sum = data.reduce((acc, val) => {
                return { hourlyVolumeUSD: parseFloat(acc['hourlyVolumeUSD']) + parseFloat(val['hourlyVolumeUSD']) };
            });
            arr.push({
                id: value.id,
                token0: value.token0.symbol,
                token1: value.token1.symbol,
                liquidity: value.reserveUSD,
                volume24h: sum['hourlyVolumeUSD'].toString(),
                fees24h: (sum['hourlyVolumeUSD'] * 0.003).toString(),
                //lastHour: data[0]['hourStartUnix'],
                yield: ((sum['hourlyVolumeUSD'] * 0.003) / value.reserveUSD * 36500).toFixed(2) + '%'
            });
        }));

        console.log(arr);
   
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

    // Listeners

    connectButton.addEventListener('click', connect);
    addLiquitidyButton.addEventListener('click', addLiquidity);
}