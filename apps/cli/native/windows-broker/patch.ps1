$ErrorActionPreference='Stop'
Add-Type -ReferencedAssemblies System.Web.Extensions -TypeDefinition @"
using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
using System.Web.Script.Serialization;
public class SironaPatch {
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern SafeFileHandle CreateFile(string p,uint a,uint s,IntPtr d,uint c,uint f,IntPtr t);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern uint GetFinalPathNameByHandle(SafeFileHandle h,StringBuilder p,uint n,uint flags);
 [StructLayout(LayoutKind.Sequential)] struct Info {public uint attr;public System.Runtime.InteropServices.ComTypes.FILETIME c,a,w;public uint volume,hi,lo,links,indexHi,indexLo;}
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetFileInformationByHandle(SafeFileHandle h,out Info i);
 [StructLayout(LayoutKind.Sequential)] struct Disposition {[MarshalAs(UnmanagedType.Bool)]public bool Delete;}
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetFileInformationByHandle(SafeFileHandle h,int c,ref Disposition d,uint size);
 [StructLayout(LayoutKind.Sequential)] struct Basic {public IntPtr reserved,peb,a,b,pid,parent;}
 [DllImport("ntdll.dll")]static extern int NtQueryInformationProcess(IntPtr p,int c,out Basic b,int size,out int length);
 [DllImport("kernel32.dll")]static extern IntPtr GetCurrentProcess();
 [DllImport("kernel32.dll",SetLastError=true)]static extern IntPtr OpenProcess(uint a,bool inherit,int pid);
 [DllImport("kernel32.dll")]static extern uint WaitForSingleObject(IntPtr h,uint ms);
 static IntPtr owner=IntPtr.Zero;
 static void CheckOwner(){if(owner==IntPtr.Zero||WaitForSingleObject(owner,0)!=258)throw new Exception("OWNER_TERMINATED");}
 static void BindOwner(int pid){Basic b;int n;if(NtQueryInformationProcess(GetCurrentProcess(),0,out b,Marshal.SizeOf(typeof(Basic)),out n)!=0||b.parent.ToInt64()!=pid)throw new Exception("INVALID_OWNER");owner=OpenProcess(0x00100000,false,pid);CheckOwner();var watcher=new System.Threading.Thread(delegate(){if(WaitForSingleObject(owner,0xFFFFFFFF)==0)Environment.Exit(77);});watcher.IsBackground=true;watcher.Start();}
 static List<SafeFileHandle> guards=new List<SafeFileHandle>();
 static string final(SafeFileHandle h){var b=new StringBuilder(32768);uint n=GetFinalPathNameByHandle(h,b,(uint)b.Capacity,0);if(n==0||n>=b.Capacity)throw new Exception("FINAL_HANDLE_FAILED");string p=b.ToString();if(!p.StartsWith(@"\\?\"))throw new Exception("FINAL_HANDLE_FAILED");return p.Substring(4).TrimEnd('\\');}
 static string hash(byte[] value){using(var sha=SHA256.Create())return BitConverter.ToString(sha.ComputeHash(value)).Replace("-","").ToLowerInvariant();}
 static SafeFileHandle open(string p,uint access,uint share,uint mode,bool directory){var h=CreateFile(p,access,share,IntPtr.Zero,mode,0x00200000u|(directory?0x02000000u:0u),IntPtr.Zero);if(h.IsInvalid)throw new Exception("FILE_BUSY_OR_UNAVAILABLE");Info info;if(!GetFileInformationByHandle(h,out info)||(info.attr&0x400)!=0||(!directory&&info.links!=1)){h.Dispose();throw new Exception("REPARSE_OR_HARDLINK_DENIED");}return h;}
 static void directory(string p){p=Path.GetFullPath(p);if(Directory.GetParent(p)!=null)directory(Directory.GetParent(p).FullName);var h=open(p,0x80,3,3,true);if(!String.Equals(final(h),p.TrimEnd('\\'),StringComparison.OrdinalIgnoreCase)){h.Dispose();throw new Exception("DIRECTORY_CHANGED");}guards.Add(h);}
 static void prepare(string root,string p){if(String.Equals(root,p,StringComparison.OrdinalIgnoreCase)){directory(root);return;}string parent=Path.GetDirectoryName(p);if(!p.StartsWith(root+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new Exception("PATH_ESCAPE");prepare(root,parent);if(!Directory.Exists(p))Directory.CreateDirectory(p);directory(p);}
 static string target(string root,string rel){if(String.IsNullOrEmpty(rel)||Path.IsPathRooted(rel)||rel.Contains(":"))throw new Exception("INVALID_PATH");foreach(string s in rel.Replace('\\','/').Split('/'))if(s==".."||s=="."||s==""||s.TrimEnd(' ','.')!=s)throw new Exception("INVALID_PATH");string p=Path.GetFullPath(Path.Combine(root,rel));if(!p.StartsWith(root+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new Exception("PATH_ESCAPE");return p;}
 public static string Apply(string input){
  var json=new JavaScriptSerializer();json.MaxJsonLength=32*1024*1024;
  var r=json.Deserialize<Dictionary<string,object>>(input);string root=Path.GetFullPath((string)r["root"]).TrimEnd('\\');var files=(System.Collections.IEnumerable)r["files"];var streams=new List<FileStream>();var records=new List<Dictionary<string,object>>();int applied=0;
  try{BindOwner(Convert.ToInt32(r["ownerPid"]));directory(root);
   foreach(Dictionary<string,object> f in files){CheckOwner();string p=target(root,(string)f["path"]);string parent=Path.GetDirectoryName(p);prepare(root,parent);string kind=(string)f["kind"];
    if(kind=="add"){if(File.Exists(p)||Directory.Exists(p))throw new Exception("BASE_CHANGED");f["stream"]=null;}
    else{var handle=open(p,0xC0010000u,1,3,false);if(!String.Equals(final(handle),p,StringComparison.OrdinalIgnoreCase)){handle.Dispose();throw new Exception("PATH_CHANGED");}var stream=new FileStream(handle,FileAccess.ReadWrite);streams.Add(stream);if(stream.Length>16*1024*1024)throw new Exception("FILE_TOO_LARGE");var bytes=new byte[(int)stream.Length];int n=0;while(n<bytes.Length){int got=stream.Read(bytes,n,bytes.Length-n);if(got==0)throw new Exception("FILE_READ_FAILED");n+=got;}if(hash(bytes)!=(string)f["oldHash"])throw new Exception("BASE_CHANGED");f["stream"]=stream;}
    f["absolute"]=p;records.Add(f);
   }
   foreach(var f in records){CheckOwner();string kind=(string)f["kind"];FileStream stream=f["stream"] as FileStream;
    if(kind=="add"){var handle=open((string)f["absolute"],0xC0010000u,1,1,false);if(!String.Equals(final(handle),(string)f["absolute"],StringComparison.OrdinalIgnoreCase)){handle.Dispose();throw new Exception("PATH_CHANGED");}stream=new FileStream(handle,FileAccess.ReadWrite);streams.Add(stream);}
    if(kind=="delete"){var d=new Disposition();d.Delete=true;if(!SetFileInformationByHandle(stream.SafeFileHandle,4,ref d,(uint)Marshal.SizeOf(d)))throw new Exception("DELETE_FAILED");}
    else{var data=Convert.FromBase64String((string)f["content"]);CheckOwner();stream.Position=0;stream.Write(data,0,data.Length);stream.SetLength(data.Length);stream.Flush(true);}
    applied++;
   }
   return json.Serialize(new{status="completed",applied=applied});
  }catch(Exception){return json.Serialize(new{status="unknown",applied=applied,code="PATCH_RECONCILIATION_REQUIRED"});}
  finally{foreach(var stream in streams)stream.Dispose();foreach(var h in guards)h.Dispose();guards.Clear();}
 }
}
"@
$inputText=[Console]::In.ReadToEnd()
if($inputText.Length -gt 33554432){throw 'PATCH_INPUT_TOO_LARGE'}
[Console]::Out.Write([SironaPatch]::Apply($inputText))
