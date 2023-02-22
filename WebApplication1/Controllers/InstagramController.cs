using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using WebApplication1.Models;
using WebApplication1.Services;

// For more information on enabling MVC for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace WebApplication1.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class InstagramController : Controller
    {
        // 裝 serivces
        private readonly IGetIgDataService _getIgDataService;


        // DI 注入
        public InstagramController(IGetIgDataService getIgdataService)
        {
            _getIgDataService = getIgdataService;
        }

        // api functions
        [HttpPost]
        public IActionResult Index(string firstName, string lastName)
        {
            string response = "HI" + firstName + lastName;
            return Ok(response);
        }

        [HttpGet]
        public IActionResult GetIgData()
        {
            var response = _getIgDataService.GetIgData();
            return Ok(response);
        }
    }
}

