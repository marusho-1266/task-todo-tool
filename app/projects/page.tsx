import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ToastProvider } from "@/components/ui/Toast";
import { getProjectsWithTaskCount } from "@/app/actions/projects";
import { ProjectsClient } from "@/components/projects/ProjectsClient";

export const metadata = {
  title: "プロジェクト管理",
};

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projects = await getProjectsWithTaskCount();

  return (
    <ToastProvider>
      <ProjectsClient projects={projects} />
    </ToastProvider>
  );
}
