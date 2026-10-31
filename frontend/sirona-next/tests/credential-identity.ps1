$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
Add-Type -ReferencedAssemblies System.Security -TypeDefinition @"
using System;
using System.IO;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Runtime.InteropServices;
public class SironaCredentialIdentityTest {
 [DllImport("advapi32.dll",SetLastError=true)] static extern bool ImpersonateAnonymousToken(IntPtr thread);
 [DllImport("advapi32.dll",SetLastError=true)] static extern bool RevertToSelf();
 [DllImport("kernel32.dll")] static extern IntPtr GetCurrentThread();
 public static bool Check(string file) {
   byte[] protectedBytes=ProtectedData.Protect(new byte[]{1,2,3},null,DataProtectionScope.CurrentUser);
   bool fileDenied=false,decryptDenied=false,anonymous=false;
   if(!ImpersonateAnonymousToken(GetCurrentThread()))throw new Exception("IDENTITY_TEST_UNAVAILABLE");
   try {
     anonymous=WindowsIdentity.GetCurrent().User.Value=="S-1-5-7";
     try{File.ReadAllBytes(file);}catch(UnauthorizedAccessException){fileDenied=true;}
     try{ProtectedData.Unprotect(protectedBytes,null,DataProtectionScope.CurrentUser);}catch(CryptographicException){decryptDenied=true;}
   }finally{if(!RevertToSelf())throw new Exception("IDENTITY_REVERT_FAILED");}
   return anonymous && fileDenied && decryptDenied;
 }
}
"@
if(-not [SironaCredentialIdentityTest]::Check($env:SIRONA_IDENTITY_TEST_FILE)){throw 'CROSS_IDENTITY_BOUNDARY_FAILED'}
Write-Output 'cross-identity-file-and-dpapi-denied'
