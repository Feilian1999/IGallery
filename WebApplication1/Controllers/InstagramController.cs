﻿using System;
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
        private readonly IGetTokenService _getTokenService;
        private readonly IExtendTokenService _extendTokenService;

        // DI 注入
        public InstagramController(IGetIgDataService getIgdataService, IGetTokenService getTokenService, IExtendTokenService extendTokenService)
        {
            _getIgDataService = getIgdataService;
            _getTokenService = getTokenService;
            _extendTokenService = extendTokenService;
        }


        // api functions
        [HttpPost("GetIndex")]
        public IActionResult Index(string firstName, string lastName)
        {
            string response = "HI" + firstName + lastName;
            return Ok(response);
        }

        [HttpPost("GetToken")]
        public async Task<ActionResult<GetTokenRs>> OAuthtoToken(String code)
        {
            GetTokenRs rs = await _getTokenService.GetToken(code).ConfigureAwait(false);
            return rs;
        }

        [HttpGet("ExtendToken")]
        public async Task<ActionResult<ExtendTokenRs>> ExtendToken(String accessToken)
        {
            ExtendTokenRs rs = await _extendTokenService.ExtendTokenRs(accessToken).ConfigureAwait(false);
            return rs;
        }

        [HttpGet("IgData")]
        public async Task<ActionResult<IgData>> GetIgData()
        {
            var response = await _getIgDataService.GetIgData().ConfigureAwait(false);
            return Ok(response);
        }

        [HttpGet("PostId")]
        public async Task<ActionResult<IgData>> GetPostId(string postId)
        {
            var response = await _getIgDataService.GetIgPost(postId).ConfigureAwait(false);
            return Ok(response);
        }

        [HttpGet("AlbumId")]
        public async Task<ActionResult<IgData>> GetAlbumData(string albumId)
        {
            var response = await _getIgDataService.GetAlbumData(albumId).ConfigureAwait(false);
            return Ok(response);
        }
    }
}

