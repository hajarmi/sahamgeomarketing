"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function TabsExample() {
  return (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <div className="p-4 border rounded-lg mt-2">
          <h3 className="text-lg font-medium">Account Settings</h3>
          <p className="text-sm text-muted-foreground">Manage your account settings here.</p>
        </div>
      </TabsContent>
      <TabsContent value="password">
        <div className="p-4 border rounded-lg mt-2">
          <h3 className="text-lg font-medium">Password Settings</h3>
          <p className="text-sm text-muted-foreground">Change your password here.</p>
        </div>
      </TabsContent>
      <TabsContent value="notifications">
        <div className="p-4 border rounded-lg mt-2">
          <h3 className="text-lg font-medium">Notification Settings</h3>
          <p className="text-sm text-muted-foreground">Configure your notification preferences here.</p>
        </div>
      </TabsContent>
    </Tabs>
  )
}
