const { ethers } = require('ethers');
const { ChainId, Fetcher, WETH, Route } = require('@uniswap/sdk');

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

        // Token Addresses
        const uniAddress = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';
        const wethAddress = '0xc778417E063141139Fce010982780140Aa0cD5Ab';

        const chainId = ChainId.RINKEBY;
        const uni = await Fetcher.fetchTokenData(chainId, uniAddress);
        const weth = WETH[chainId];
        const pair = await Fetcher.fetchPairData(uni, weth);
        const route = new Route([pair], weth);
        console.log(route.midPrice.toSignificant(6));
        console.log(route.midPrice.invert().toSignificant(6));

        const routerContract = new ethers.Contract(
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

        console.log(swapTx.hash);*/

        const addETH = await routerContract.addLiquidityETH(
            uni.address,
            "1500000000000000000",
            "1000000000000000000",
            "1000000000000000000",
            signerAddress,
            deadline,
            { value: ethers.utils.parseEther('2.0'), gasLimit: 2000000 }
        )

        console.log(addETH.hash);
    }

    // Listeners

    connectButton.addEventListener('click', connect);
    addLiquitidyButton.addEventListener('click', addLiquidity);
}