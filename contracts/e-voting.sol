// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VotingSystem {

    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }
    
    mapping(address => bool) public eligibleVoter;
    mapping(address => bool)public isVoted;
    mapping(uint256 => Candidate) public candidates;

    address public _owner ;

    uint256 public candidateCount;

    uint256 public pooling_start = 1724920500;
    uint256 public pooling_end = 1724920800;

    uint256 public result_time = pooling_end+1;

    uint256 public total_votes;

    constructor() {
        _owner = msg.sender;
    }

    /**
    * Add New Candiate 
    */
    function addCandidate(string memory _name) public onlyOwner {
        require(block.timestamp < pooling_start ,"Pooling Started");
        candidateCount++;
        candidates[candidateCount] = Candidate(candidateCount, _name, 0);
    }

    /**
    * Get Total Candidate List
    */
    function totalCandidate() public view returns(uint256) {

        return candidateCount;
    }

    /**
    * Set Voter Eligible 
    */
    function setVoterEligible(address[] calldata _addr ) public onlyOwner {
        
        require(_addr.length <= 20 ,"Gas Limit");
        uint i;
        for(i=0;i<_addr.length;i++)
        {
            require(eligibleVoter[_addr[i]] == false,"Already Eligible");

            eligibleVoter[_addr[i]] = true;
        }
    }

    /**
    * Allow Public to Vote
    */
    function vote(uint256 _candidate_id) public {

        require (((block.timestamp >= pooling_start) && (block.timestamp <= pooling_end)) ,"Pooling Not Allowed");

        require(eligibleVoter[msg.sender] == true , "Not Eligible to vote");
        require(isVoted[msg.sender] == false ,"Duplicate Vote");

        require(_candidate_id > 0 && _candidate_id <= candidateCount,"Not a Valid Candidate");

        isVoted[msg.sender] = true;

        candidates[_candidate_id].voteCount++;

        total_votes++;
    } 

    /**
    * Generate Pooling result
    */
    function getWinnerAndPercentage() private view returns (uint256 winnerId, uint256 winnerVotes, uint256 percentage) {
        uint256 highestVotes = 0;
        uint256 winningCandidateId = 0;

        for (uint256 i = 1; i <= candidateCount; i++) { 
            uint256 votes = candidates[i].voteCount;
            if (votes > highestVotes) {
                highestVotes = votes;
                winningCandidateId = i;
            }
        }

        winnerId = winningCandidateId;
        winnerVotes = highestVotes;
        percentage = (highestVotes * 100) / total_votes;
    }

    /**
    * Get Pooling Result After Pooling Ended
    */
    function listPoolingResult()  public view returns (string memory _name , uint256 _total_votes , uint256 _winner_share , uint256 _winner_percentage )  {
         require(block.timestamp >= result_time , "Pooling Not ended");

          (uint256 winner_id , uint256 winner_votes , uint256 percentage ) = getWinnerAndPercentage();

         _name = candidates[winner_id].name;

         _total_votes = total_votes;

         _winner_share = winner_votes;

         _winner_percentage = percentage;
    }

    /**
    * Get Candidate List
    */
    function getCandidateList() public view returns (Candidate[] memory) {
        Candidate[] memory candidateArray = new Candidate[](candidateCount);
        for (uint256 i = 0; i < candidateCount; i++) {
            candidateArray[i] = candidates[i + 1];
        }
        return candidateArray;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(owner() == msg.sender, "Ownable: caller is not the owner");
        _;
    }
}
