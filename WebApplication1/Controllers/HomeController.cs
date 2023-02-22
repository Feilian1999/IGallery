using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

// For more information on enabling MVC for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace WebApplication1.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class InstagramController : Controller
    {
        // GET: /<controller>/
        [HttpPost]
        public IActionResult Index(string firstName, string lastName)
        {
            string response = "HI" + firstName + lastName;
            return Ok(response);
        }
    }
}

