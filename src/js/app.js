var multiplier = 100
var miliseconds = 1000
var dameMasGasolina = 1000000
const monthNames = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June",
  "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."
];

App = {
  web3Provider: null,
  contracts: {},

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
    if(typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
    } else{
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
    }
    web3 = new Web3(App.web3Provider);
    return App.initContract();
  },

  initContract: function() {
    $.getJSON('CrowdfundingFactory.json', function(data) {
      var CrowdfundingArtifact = data;
      App.contracts.CrowdfundingFactory = TruffleContract(CrowdfundingArtifact);

      App.contracts.CrowdfundingFactory.setProvider(App.web3Provider);

      return App.displayCampaigns();
    });

    return App.bindEvents();
  },

  bindEvents: function() {

    $(document).on('click', '.btn-contribute', App.handleContribute);
    $(document).on('click', '.btn-createCampaign', App.createCampaign);
    $(document).on('click', '.btn-goalReached', App.handleGoalReached);
    $(document).on('click', '.btn-fail', App.handleFailCampaign);
    $(document).on('click', '.btn-paydebt', App.handlePayDebt);
    $(document).on('click', '.btn-shares', App.handleClaimRefundorShares);
    $(document).on('click', '.btn-refund', App.handleClaimRefundorShares);
    $(document).on('click', '#emergencyStop', App.emergencyStop);
    
  },

  createCampaign: function(event) {

    event.preventDefault();
    var name = $('#name').val();
    var goal = $('#goal').val();
    var rate = $('#rate').val();
    var term = $('#term').val();
    var date = $('#datetimepicker1').val();
    var endDate = Date.parse(date)/miliseconds;

    if (name == "" || goal == "" || rate =="" || term == "" || isNaN(endDate)){
      $(".alert-danger").show()
      return 0
    }
    else{
      $(".alert-success").show()
      $(".alert-danger").hide()
      
    }
    
    console.log("endDate")
    console.log(endDate)
    web3.eth.getAccounts(function(error, accounts){
      if(error){
        console.log(error);
      }

      var account = accounts[0];
      App.contracts.CrowdfundingFactory.deployed().then(function(instance){
        crowdfundingInstance = instance;


      const reader = new FileReader();
      reader.onloadend = function() {
        const ipfs = window.IpfsApi('localhost', 5001) // Connect to IPFS
        const buf = buffer.Buffer(reader.result) // Convert data into buffer
        ipfs.files.add(buf, (err, result) => { // Upload buffer to IPFS
          if(err) {
            console.error(err)
            return
          }
          let url = `https://ipfs.io/ipfs/${result[0].hash}`
          return crowdfundingInstance.createCampaign(name, url, web3.toWei(goal), endDate, rate, term, {from: account});
        })
      }
      const photo = document.getElementById("inputGroupFile01");
      try{
        reader.readAsArrayBuffer(photo.files[0]); 
        console.log("image")
      }catch(ex){
        console.log("no image create")
        return crowdfundingInstance.createCampaign(name, "", web3.toWei(goal), endDate, rate, term, {from: account});
      }}).then(function(result){
        console.log(result)
        $("#exampleModal").modal('hide');
        $("#createCampaign")[0].reset()
        return App.displayCampaigns();
      }).catch(function(err){
        console.log(err.message);
      });
    });
  },

  displayCampaigns: function(account) {
    var adoptionInstance;
    
    
    
    web3.eth.getAccounts(function(error, accounts){
      if(error){
        console.log(error);
      }
      var account = accounts[0];
      console.log(account)
      web3.eth.getBalance(account,'latest',function(error,balance){
      console.log(web3.fromWei(balance.toNumber()))
    })
      
      App.contracts.CrowdfundingFactory.deployed().then(function(instance){
        crowdfundingInstance = instance;
        return crowdfundingInstance.owner.call();

      }).then(function(owner){
        if (owner == account){$("#emergencyStop").show()}
        else{$("#emergencyStop").hide()}

        return crowdfundingInstance.numCampaigns.call();
      }).then(async function(campaigns){

       var campaignTemplate = $('#campaignTemplate');
       $('#campaignsRow').html("")
       

        for (i = 1; i <= campaigns; i ++) {
          const campaignId = i;
          var investor = await crowdfundingInstance.getInvestorID.call(i,{from:account}).then(async function(investorId){
            if (investorId > 0){
              var investor = await crowdfundingInstance.getInvestorInCampaign.call(investorId.toNumber(),campaignId).then(function(investor){
                return {"isInvestor":"is-investor", "amount":web3.fromWei(investor[1].toNumber()/multiplier), "balance":web3.fromWei(investor[2].toNumber()/multiplier)}
              });
              
              return investor
            }
            return {"isInvestor":"", "amount":"N/A", "balance":"N/A"}
          },function failure(){
          }.bind(campaignId));
          //var campaign = crowdfundingInstance.getCampaign.call(i).then(function(data){
          var campaign = crowdfundingInstance.campaigns.call(i).then(function(data){
              displayConstraints(data,campaignId,investor,account,campaignTemplate)
          },function failure(result){

          }.bind(campaignId))
        }
        //$grid.isotope({ filter: '*' });  
        //$grid.isotope('layout');  

      }).catch(function(err){
        console.log(err.message);
      });
    })

  },

  handleContribute: function(event) {
    event.preventDefault();

    var campaignId = parseInt($(event.target).val());
    var crowdfundingInstance;
    var contributeAmount = $("#campaign-"+campaignId).find(".amount-value").val()

    web3.eth.getAccounts(function(error, accounts){
      if(error){
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.CrowdfundingFactory.deployed().then(function(instance){
        crowdfundingInstance = instance;
        return crowdfundingInstance.contribute(campaignId, {from: account, value: web3.toWei(contributeAmount)});
      }).then(function(result){
        console.log(result)
        return App.displayCampaigns();
      }).catch(function(err){
        console.log(err.message);
      });
    });
  },
  handleGoalReached: function(event){
    event.preventDefault();
    var campaignId = parseInt($(event.target).val());
    var term = parseInt($("#campaign-"+campaignId).find(".campaign-term-value").val());
  
    console.log(term)

    
    var crowdfundingInstance;
    
    web3.eth.getAccounts(function(error, accounts){
      if(error){
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.CrowdfundingFactory.deployed().then(function(instance){
        crowdfundingInstance = instance;
        return crowdfundingInstance.goalReached(campaignId,{from: account})
      }).then(function(result){
        return App.displayCampaigns();
      }).catch(function(err){
        console.log(err.message);
      });
    });
  },
  handleFailCampaign: function(event){
    event.preventDefault();
    var campaignId = parseInt($(event.target).val());
    var contributeAmount = parseInt($(event.target).data("amount"));
    var crowdfundingInstance;
    
    web3.eth.getAccounts(function(error, accounts){
      if(error){
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.CrowdfundingFactory.deployed().then(function(instance){
        crowdfundingInstance = instance;
        return crowdfundingInstance.failCampaign(campaignId, {from: account});
      }).then(function(result){
        return App.displayCampaigns();
      }).catch(function(err){
        console.log(err.message);
      });
    });
  },
  handlePayDebt: function(event){
    event.preventDefault();
    var campaignId = parseInt($(event.target).val());
    var crowdfundingInstance;
    var amount = $("#campaign-"+campaignId).find(".debt-value").val()
    console.log(amount)
    console.log(campaignId)
    web3.eth.getAccounts(function(error, accounts){
      if(error){
        console.log(error);
      }
      var account = accounts[0];

      App.contracts.CrowdfundingFactory.deployed().then(function(instance){
        crowdfundingInstance = instance;
        return crowdfundingInstance.payDebt(campaignId, {from: account,value: web3.toWei(amount)});
      }).then(function(result){
        return App.displayCampaigns();
      }).catch(function(err){
        console.log(err.message);
      });
    });
  },
    handleClaimRefundorShares: function(event){
    event.preventDefault();
    var campaignId = parseInt($(event.target).val());
    var crowdfundingInstance;
    var action = $(event.target).data("action")
    web3.eth.getAccounts(function(error, accounts){
      if(error){
        console.log(error);
      }

      var account = accounts[0];
      App.contracts.CrowdfundingFactory.deployed().then(function(instance){
        crowdfundingInstance = instance;
        if (action == "shares"){
          return crowdfundingInstance.claimShare(campaignId, {from: account,gas:dameMasGasolina});  
        }
        else if (action == "refund"){
          return crowdfundingInstance.claimRefund(campaignId, {from: account,gas:dameMasGasolina});
        }
      }).then(function(result){
        return App.displayCampaigns();
      }).catch(function(err){
        console.log(err.message);
      });
    });
  },
  emergencyStop: function(event){
    event.preventDefault();
    var adoptionInstance;
    web3.eth.getAccounts(function(error, accounts){
      if(error){
        console.log(error);
      }
      var account = accounts[0];
      App.contracts.CrowdfundingFactory.deployed().then(function(instance){
        crowdfundingInstance = instance;
        crowdfundingInstance.toggleEmergency({from:account})
      })
    })
  }

};

$(function() {

    App.init();
  
});


$('#exampleModal').on('show.bs.modal', function (event) {
  $(".modal .alert-success").hide()
  $(".modal .alert-danger").hide()
})

$('#datetimepicker1').datepicker({
  uiLibrary: 'bootstrap4',
  minDate: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()+1)
});

$('body').tooltip({
    selector: '[data-toggle="tooltip"]',
    trigger:'hover'
});

var $grid =$('#campaignsRow').isotope({
  // options
  itemSelector: '.campaign-container',
  layoutMode: 'fitRows',
});
$(".filter").click(function(){
  $grid.isotope({ filter: $(this).data('status') }); 
})

var accountA = web3.eth.accounts[0];
var accountInterval = setInterval(function() {
  if (web3.eth.accounts[0] !== accountA) {
    accountA = web3.eth.accounts[0];
    App.displayCampaigns();
  }
}, 100);


function getStatusName(status){
  var statusText = ""
  var css = "primary"

  switch(status) {
      case 0:
        statusText = 'Active'
        css = "primary"
        break;
      case 1:
        statusText = 'Refunding'
        css = "success"
        break;
      case 2:
        statusText = 'Terminated'
        css = "warning"
        break;
      case 3:
        statusText = 'Failed'
        css = "danger"
        break;
  }
  return [statusText,css];
}

function displayConstraints(data,campaignId,investor,account,campaignTemplate){
  
  var status = getStatusName(data[9].toNumber());
  var refundDeadline = new Date(data[6].toNumber()*miliseconds)
  console.log(refundDeadline)
  var percent = data[2]/data[3]*multiplier
  var color; if (percent == 0){color="black"}else{color="white"};
  var date = new Date(data[5].toNumber()*miliseconds)
  var isBeneficiary,goalReached = ""
  if (data[4] == account){
    isBeneficiary = "is-beneficiary"
  }
  if (data[2].toNumber() == data[3].toNumber()){
    goalReached = "goal-reached"
  }
  campaignTemplate.find('.campaign-container').attr("id","campaign-"+campaignId);
  campaignTemplate.find('.campaign-container').attr("class","col-md-6 campaign-container is-"+status[0].toLowerCase()+" "+investor["isInvestor"]+" "+isBeneficiary+" "+goalReached);
  campaignTemplate.find('.card-header').attr("class","card-header alert-"+status[1]+" text-"+status[1]);
  campaignTemplate.find('.card').attr("class","my-3 card border-"+status[1]);
  campaignTemplate.find('.progress-bar').css("width",percent+"%");
  campaignTemplate.find('.progress-bar').css("color",color);
  campaignTemplate.find('.progress-bar').text(percent.toFixed(1)+"%");
  campaignTemplate.find('.campaign-invested-amount').text(investor["amount"]);
  campaignTemplate.find('.campaign-balance').text(investor["balance"]);
  campaignTemplate.find('.campaign-name').text(data[0]);
  campaignTemplate.find('.campaign-status>span').text(status[0]);
  campaignTemplate.find('.campaign-status>span').attr("class","badge badge-"+status[1]);
  campaignTemplate.find('.campaign-amount').text(web3.fromWei(data[2]/multiplier));
  campaignTemplate.find('.campaign-goal').text(web3.fromWei(data[3]/multiplier));
  campaignTemplate.find('.campaign-endDate').text(date.getDate()+" "+monthNames[(date.getMonth())]+" "+date.getFullYear());
  campaignTemplate.find('.campaign-term').text(data[8]+" months");
  campaignTemplate.find('.campaign-term-value').val(data[8]);
  campaignTemplate.find('.campaign-rate').text(data[7]+"%");
  campaignTemplate.find('.campaign-debt').text(web3.fromWei(data[10]/multiplier));
  campaignTemplate.find('.refund-deadline').text(refundDeadline.getDate()+" "+monthNames[(refundDeadline.getMonth())]+" "+refundDeadline.getFullYear());
  campaignTemplate.find('.beneficiary-address').html('<a href="#" data-title="Beneficiary address: '+data[4]+'" class="fas fa-address-card ml-1" data-toggle="tooltip" data-placement="top"></a>');
  campaignTemplate.find('.btn-contribute').text("Contribute");
  campaignTemplate.find('.btn-contribute').val(campaignId);
  campaignTemplate.find('.btn-goalReached').val(campaignId);
  campaignTemplate.find('.btn-fail').val(campaignId);
  campaignTemplate.find('.btn-refund').val(campaignId);
  campaignTemplate.find('.btn-paydebt').val(campaignId);
  campaignTemplate.find('.btn-shares').val(campaignId);
  var image = data[1]
  if (image != ""){
    campaignTemplate.find('.campaign-img').attr("src",image);  
  }
  else{
   campaignTemplate.find('.campaign-img').attr("src","images/placeholder-image.jpg");   
  }
  //campaignsRow.append(campaignTemplate.html());
  let $item = $(campaignTemplate.html())
  $grid.append($item).isotope('appended',$item).isotope('layout')
 
}
