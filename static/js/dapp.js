async function connectToBlockchain() {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        try {
            await window.ethereum.enable();
            selectedAccount = (await web3.eth.getAccounts())[0];
            updateUIForConnectedWallet();
        } catch (error) {
            displayError("User denied account access.");
        }
    } else {
        displayError("Please install MetaMask!");
    }
}

let web3;
let contract;
let selectedAccount;

var path = window.location.pathname;

async function initContract() {
    try {
        contract = new web3.eth.Contract(contractABI, contractAddress);

        const owner = await contract.methods.owner().call();   
        if(selectedAccount == owner) {
            document.getElementById('adminLink').classList.remove('d-none');
       } else {
           document.getElementById('adminLink').classList.add('d-none');
       }     
        if(path === "/")
        {
            await loadCandidates();
            await getPoolTime();
        } else if (path === "/admin")
        {
            if (selectedAccount !== owner) {
                displayError("You are not authorized to access this page.");
                return;
            }
        }
    } catch (error) {
        displayError("Failed to initialize contract. Please try again later.");
    }
}

function updateUIForConnectedWallet() {
    document.getElementById('connectWalletButton').classList.add('d-none');
    document.getElementById('disconnectWalletButton').classList.remove('d-none');
    document.getElementById('walletAddress').classList.remove('d-none');
    document.getElementById('addressDisplay').textContent = selectedAccount;
}

// Disconnect the wallet (refresh page to simulate disconnect)
function disconnectWallet() {
    selectedAccount = null;
    document.getElementById('connectWalletButton').classList.remove('d-none');
    document.getElementById('disconnectWalletButton').classList.add('d-none');
    document.getElementById('walletAddress').classList.add('d-none');
    location.reload();  // Simulate disconnect by reloading the page
}

// Load the candidate list from the contract
async function loadCandidates() {
    try {
        const candidateCount = await contract.methods.candidateCount().call();
        const candidateSelect = document.getElementById('candidateSelect');

        for (let i = 1; i <= candidateCount; i++) {
            const candidate = await contract.methods.candidates(i).call();
            const option = document.createElement('option');
            option.value = candidate.id;
            option.textContent = candidate.name;
            candidateSelect.appendChild(option);
        }
    } catch (error) {
        displayError("Failed to load candidates. Polling may not have started yet.");
    }
}

async function getPoolTime() {

    try {
         const pool_start = await contract.methods.pooling_start().call();
         const pool_end = await contract.methods.pooling_end().call();

         const pool_start_date = convertUnixToDateTime(pool_start,'Asia/Singapore');
         const pool_end_date = convertUnixToDateTime(pool_end,'Asia/Singapore');

         const result_time = await contract.methods.result_time().call();

         const restul_date = convertUnixToDateTime(result_time,'Asia/Singapore');

        document.getElementById('pool_time').textContent = " Pooling Start From "+pool_start_date + " to " + pool_end_date ;

        document.getElementById('result_time').textContent = " Result Announce After  "+restul_date ;

    } catch (error) {
        displayError(error);
    }
}


// Vote function with pre-transaction check
async function vote(candidateId) {
    try {
        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];

        // Estimate gas to check if the transaction will succeed
        const gasEstimate = await contract.methods.vote(candidateId).estimateGas({ from: account });

        // If the estimate succeeds, send the transaction
        await contract.methods.vote(candidateId).send({ from: account, gas: gasEstimate });
        alert("Vote submitted successfully!");
    } catch (error) {
        displayError("Voting failed. " + error.data.message);
    }
}

// Get winner and percentage function
async function getWinnerAndPercentage() {
    try {
        const result = await contract.methods.listPoolingResult().call();
        return result;
    } catch (error) {
        displayError("Failed to get the results. " + error.message);
    }
}

// Add Candidate function
async function addCandidate(name) {
    try {
        const gasEstimate = await contract.methods.addCandidate(name).estimateGas({ from: selectedAccount });
        await contract.methods.addCandidate(name).send({ from: selectedAccount,  gas: gasEstimate });
        alert("Candidate added successfully!");
    } catch (error) {
        displayError("Failed to add candidate. " + error.data.message);
    }
}

// Allow Multiple Addresses to Vote function
async function allowMultipleAddressesToVote(addresses) {
    try {
        const gasEstimate = await contract.methods.setVoterEligible(addresses).estimateGas({ from: selectedAccount });
        await contract.methods.setVoterEligible(addresses).send({ from: selectedAccount, gas:gasEstimate });
        alert("Addresses allowed to vote successfully!");
    } catch (error) {
        displayError("Failed to allow addresses to vote. " + error.data.message);
    }
}

// Display error messages
function displayError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('d-none');
}

// Event listeners
document.getElementById('connectWalletButton').addEventListener('click', async () => {
    await connectToBlockchain();
    await initContract();
});

document.getElementById('disconnectWalletButton').addEventListener('click', () => {
    disconnectWallet();
});

if(path === "/")
{
    // Event listeners
    document.getElementById('voteForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const candidateId = document.getElementById('candidateSelect').value;
        await vote(candidateId);
    });

    document.getElementById('getResultBtn').addEventListener('click', async () => {
        const result = await getWinnerAndPercentage();
        if (result) {
            document.getElementById('winnerId').textContent = result[0];
            document.getElementById('totalVotes').textContent = result[1];
            document.getElementById('winnerVotes').textContent = result[2];
            document.getElementById('percentage').textContent = result[3];
            document.getElementById('result').classList.remove('d-none');
        }
    });
   
} else {
    document.getElementById('addCandidateForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const candidateName = document.getElementById('candidateName').value;
        await addCandidate(candidateName);
    });
    
    document.getElementById('allowMultipleAddressesForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const voterAddressesString = document.getElementById('voterAddresses').value;
        const voterAddresses = voterAddressesString.split(',').map(address => address.trim());
    
        if (voterAddresses.length > 20) {
            displayError("You can only add up to 20 addresses at a time.");
            return;
        }
    
        await allowMultipleAddressesToVote(voterAddresses);
    });
}

// Initialize the DApp if already connected
window.addEventListener('load', async () => {
    if (window.ethereum && window.ethereum.selectedAddress) {
        await connectToBlockchain();
        await initContract();
    }
});

function convertUnixToDateTime(unixTimestamp, timeZone) {
    const date = new Date(Number(unixTimestamp) * 1000); // Convert to milliseconds
    const options = {
        timeZone: timeZone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };

    const formatter = new Intl.DateTimeFormat([], options);
    return formatter.format(date);
}


